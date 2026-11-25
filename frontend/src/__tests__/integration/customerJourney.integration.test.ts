// @vitest-environment node
/**
 * Live customer journey against the real Supabase + Razorpay TEST mode + Shiprocket dev sandbox.
 * Uses a temporary customer and product; everything is deleted at the end.
 * Run with:  RUN_INTEGRATION=1 npx vitest run src/__tests__/integration
 */
import fs from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
);
Object.assign(process.env, env);

const customer = { id: '', email: `zz-journey-${Date.now()}@example.com` };
vi.mock('@/lib/apiAuth', () => ({
  requireUser: async () => ({ user: { id: customer.id, email: customer.email }, response: null }),
  requireAdmin: async () => ({ user: { id: 'integration-admin' }, response: null }),
}));

// Don't send real emails to the temporary @example.com customer.
vi.mock('@/lib/mailer', () => ({ sendEmail: async () => ({ sent: true }) }));

const enabled = process.env.RUN_INTEGRATION === '1';
vi.setConfig({ testTimeout: 60_000 }); // live cloud calls are slower than unit tests
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) as any;
const json = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) });
const address = {
  full_name: 'ZZ Journey Tester', phone: '9876501234', address_line_1: '1 Test Street',
  city: 'Bengaluru', state: 'Karnataka', pincode: '560001',
};

let productId = '';
let variantId = '';
const orderIds: string[] = [];
const stockOf = async () =>
  (await db.from('inventory').select('quantity').eq('variant_id', variantId).single()).data.quantity as number;

describe.skipIf(!enabled)('Customer journey (live)', () => {
  beforeAll(async () => {
    const { data: u, error } = await db.auth.admin.createUser({ email: customer.email, email_confirm: true, password: `Zz!${Date.now()}` });
    if (error) throw error;
    customer.id = u.user.id;

    const { data: color } = await db.from('colors').select('id').limit(1).single();
    const { data: size } = await db.from('size_options').select('id').limit(1).single();
    const { saveProduct } = await import('@/lib/admin/products');
    productId = await saveProduct(db, {
      name: 'ZZ Journey Test Tee', description: null, fabric: null, fit: null, pattern: null, sleeve_type: null,
      neck_type: null, gender: null, status: 'active', category_ids: [], collection_ids: [], images: [],
      variants: [{ color_id: color.id, size_option_id: size.id, price: 899, compare_at_price: null, stock: 5 }],
    });
    variantId = (await db.from('product_variants').select('id').eq('product_id', productId).single()).data.id;
  }, 60_000);

  afterAll(async () => {
    for (const id of orderIds) {
      await db.from('email_log').delete().eq('order_id', id);
      await db.from('order_items').delete().eq('order_id', id);
      await db.from('coupon_usages').delete().eq('order_id', id);
      await db.from('orders').delete().eq('id', id);
    }
    if (productId) {
      await db.from('inventory').delete().eq('variant_id', variantId);
      await db.from('product_variants').delete().eq('product_id', productId);
      await db.from('product_media').delete().eq('product_id', productId);
      await db.from('products').delete().eq('id', productId);
    }
    if (customer.id) await db.auth.admin.deleteUser(customer.id);
  }, 60_000);

  it('1. places a COD order: server prices it, free shipping at ₹1,500+, stock goes down, shipment booked (sandbox)', async () => {
    const { POST } = await import('@/app/api/orders/route');
    const res = await POST(json({ items: [{ variant_id: variantId, quantity: 2 }], shipping_address: address, order: { total: 1 } }));
    const body = await res.json();
    expect(res.status, JSON.stringify(body)).toBe(200);
    orderIds.push(body.order_id);

    const { data: order } = await db.from('orders').select('*').eq('id', body.order_id).single();
    expect(order).toMatchObject({ status: 'confirmed', payment_method: 'cod', payment_status: 'pending', user_id: customer.id });
    expect(Number(order.subtotal)).toBe(1798);
    expect(Number(order.shipping)).toBe(0);          // 1798 ≥ 1500
    expect(Number(order.total)).toBe(1798);          // client's "total: 1" ignored
    expect(order.tracking_number).toMatch(/^SRK-DEV-/); // Shiprocket dev sandbox
    expect(order.shiprocket_shipment_id).toBeTruthy();   // saved so a retry never books twice
    expect(order.courier_name).toBeTruthy();
    expect(order.shipping_error).toBeNull();
    expect(await stockOf()).toBe(3);
  });

  it('2. charges the ₹99 fee below the free-shipping amount', async () => {
    const { POST } = await import('@/app/api/orders/route');
    const body = await (await POST(json({ items: [{ variant_id: variantId, quantity: 1 }], shipping_address: address }))).json();
    orderIds.push(body.order_id);
    expect(body.totals).toMatchObject({ subtotal: 899, shipping: 99, total: 998 });
    expect(await stockOf()).toBe(2);
  });

  it('3. blocks ordering more than the stock left', async () => {
    const { POST } = await import('@/app/api/orders/route');
    const res = await POST(json({ items: [{ variant_id: variantId, quantity: 5 }], shipping_address: address }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Only 2 left/);
    expect(await stockOf()).toBe(2);
  });

  it('4. rejects an invalid coupon and a bad address', async () => {
    const { POST } = await import('@/app/api/orders/route');
    expect((await POST(json({ items: [{ variant_id: variantId, quantity: 1 }], shipping_address: address, coupon_code: 'NOPE-XYZ' }))).status).toBe(400);
    expect((await POST(json({ items: [{ variant_id: variantId, quantity: 1 }], shipping_address: { ...address, pincode: '12' } }))).status).toBe(400);
  });

  it('5. customer cancels the first order: items cancelled, stock comes back', async () => {
    const { POST } = await import('@/app/api/payments/razorpay/refund/route');
    const { data: items } = await db.from('order_items').select('id').eq('order_id', orderIds[0]);
    const res = await POST(json({ order_id: orderIds[0], item_id: items[0].id }));
    const body = await res.json();
    expect(res.status, JSON.stringify(body)).toBe(200);
    expect(body.new_status).toBe('cancelled');
    expect(await stockOf()).toBe(4);
  });

  it('6. Razorpay TEST: creates a real test order for the server-computed amount', async () => {
    const { POST } = await import('@/app/api/payments/razorpay/create-order/route');
    const res = await POST(json({ items: [{ variant_id: variantId, quantity: 2 }], shipping_address: address }));
    const body = await res.json();
    expect(res.status, JSON.stringify(body)).toBe(200);
    orderIds.push(body.order_id);
    expect(body.razorpay_order_id).toMatch(/^order_/);
    expect(body.amount).toBe(179800);
    expect(body.key_id).toMatch(/^rzp_test_/);

    const { data: order } = await db.from('orders').select('status, payment_status, razorpay_order_id').eq('id', body.order_id).single();
    expect(order).toMatchObject({ status: 'pending', payment_status: 'pending', razorpay_order_id: body.razorpay_order_id });
    expect(await stockOf()).toBe(4); // stock is only taken once payment is verified
  });

  it('7. Razorpay: a forged payment confirmation is rejected', async () => {
    const { POST } = await import('@/app/api/payments/razorpay/verify-payment/route');
    const { data: order } = await db.from('orders').select('id, razorpay_order_id').eq('id', orderIds.at(-1)).single();
    const res = await POST(json({ order_id: order.id, razorpay_order_id: order.razorpay_order_id, razorpay_payment_id: 'pay_fake', razorpay_signature: 'forged' }));
    expect(res.status).toBe(400);
    const { data: after } = await db.from('orders').select('payment_status').eq('id', order.id).single();
    expect(after.payment_status).toBe('pending');
  });

  it('8. customer sees their own orders; order tracking by WAR- reference works', async () => {
    const { GET } = await import('@/app/api/orders/route');
    const list = await (await GET(new Request('http://x/api/orders'))).json();
    expect(list.orders.map((o: any) => o.id)).toEqual(expect.arrayContaining(orderIds));

    const ref = `WAR-${orderIds[1].replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    const tracked = await (await GET(new Request(`http://x/api/orders?ref=${ref}`))).json();
    expect(tracked.orders[0].id).toBe(orderIds[1]);
  });

  it('9. admin sees the orders and can mark one shipped', async () => {
    const { GET } = await import('@/app/api/admin/orders/route');
    const all = await (await GET()).json();
    expect(all.orders.some((o: any) => o.id === orderIds[1])).toBe(true);

    const { PATCH } = await import('@/app/api/admin/orders/[id]/route');
    const res = await PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ status: 'shipped' }) }), { params: Promise.resolve({ id: orderIds[1] }) });
    expect(res.status).toBe(200);
    const { data } = await db.from('orders').select('status').eq('id', orderIds[1]).single();
    expect(data.status).toBe('shipped');
  });
});
