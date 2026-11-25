// @vitest-environment node
/**
 * Live check of order emails + reviews against the real Supabase (2026_10_09 migration).
 * Emails are captured, not sent. Temporary customer/product/orders are deleted at the end.
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
Object.assign(process.env, env, { SHIPROCKET_WEBHOOK_TOKEN: 'zz-test-token', NEXT_PUBLIC_SITE_URL: 'https://shop.test' });

const customer = { id: '', email: `zz-reviews-${Date.now()}@example.com` };
vi.mock('@/lib/apiAuth', () => ({
  requireUser: async () => ({ user: { id: customer.id, email: customer.email }, response: null }),
  requireAdmin: async () => ({ user: { id: 'integration-admin' }, response: null }),
}));
const sent: { to: string; subject: string; html: string }[] = [];
vi.mock('@/lib/mailer', () => ({ sendEmail: async (m: any) => { sent.push(m); return { sent: true }; } }));

const enabled = process.env.RUN_INTEGRATION === '1';
vi.setConfig({ testTimeout: 60_000 });
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) as any;
const json = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) });
const address = { full_name: 'ZZ Review Tester', phone: '9876501234', address_line_1: '1 Test Street', city: 'Pune', state: 'Maharashtra', pincode: '411001' };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

let productId = '';
let productSlug = '';
let variantId = '';
const orderIds: string[] = [];

describe.skipIf(!enabled)('Order emails + reviews (live)', () => {
  beforeAll(async () => {
    const { data: u, error } = await db.auth.admin.createUser({ email: customer.email, email_confirm: true, password: `Zz!${Date.now()}` });
    if (error) throw error;
    customer.id = u.user.id;
    await db.from('profiles').upsert({ id: customer.id, email: customer.email, name: 'Zara Review Tester', role: 'customer' });

    const { data: color } = await db.from('colors').select('id').limit(1).single();
    const { data: size } = await db.from('size_options').select('id').limit(1).single();
    const { saveProduct } = await import('@/lib/admin/products');
    productId = await saveProduct(db, {
      name: 'ZZ Review Test Tee', description: null, fabric: null, fit: null, pattern: null, sleeve_type: null,
      neck_type: null, gender: null, status: 'active', category_ids: [], collection_ids: [], images: [],
      variants: [{ color_id: color.id, size_option_id: size.id, price: 799, compare_at_price: null, stock: 10 }],
    });
    productSlug = (await db.from('products').select('slug').eq('id', productId).single()).data.slug;
    variantId = (await db.from('product_variants').select('id').eq('product_id', productId).single()).data.id;
  }, 60_000);

  afterAll(async () => {
    for (const id of orderIds) {
      await db.from('email_log').delete().eq('order_id', id);
      await db.from('order_items').delete().eq('order_id', id);
      await db.from('orders').delete().eq('id', id);
    }
    if (productId) {
      await db.from('product_reviews').delete().eq('product_id', productId);
      await db.from('inventory').delete().eq('variant_id', variantId);
      await db.from('product_variants').delete().eq('product_id', productId);
      await db.from('products').delete().eq('id', productId);
    }
    if (customer.id) await db.auth.admin.deleteUser(customer.id);
  }, 60_000);

  it('1. placing an order emails a confirmation to the customer', async () => {
    const { POST } = await import('@/app/api/orders/route');
    const body = await (await POST(json({ items: [{ variant_id: variantId, quantity: 2 }], shipping_address: address }))).json();
    orderIds.push(body.order_id);
    const mail = sent.find((m) => m.subject.startsWith('Order confirmed'));
    expect(mail?.to).toBe(customer.email);
    expect(mail?.html).toContain('ZZ Review Test Tee');
    expect(mail?.html).toContain('Hi Zara');
  });

  it('2. cannot review before the order is delivered', async () => {
    const { POST } = await import('@/app/api/products/[id]/reviews/route');
    expect((await POST(json({ rating: 5, body: 'Lovely heavy tee.' }), ctx(productId))).status).toBe(403);
    const { GET } = await import('@/app/api/products/[id]/reviews/me/route');
    expect(await (await GET(new Request('http://x'), ctx(productId))).json()).toMatchObject({ canReview: false, review: null });
  });

  it('3. Shiprocket "DELIVERED" marks the order delivered and emails review links — once', async () => {
    const { POST } = await import('@/app/api/webhooks/shiprocket/route');
    const hook = () => POST(new Request('http://x', {
      method: 'POST', headers: { 'x-api-key': 'zz-test-token' }, body: JSON.stringify({ order_id: orderIds[0], current_status: 'DELIVERED' }),
    }));
    expect((await hook()).status).toBe(200);
    expect((await hook()).status).toBe(200); // Shiprocket retry

    const { data: order } = await db.from('orders').select('status').eq('id', orderIds[0]).single();
    expect(order.status).toBe('delivered');
    const delivered = sent.filter((m) => m.subject.startsWith('Delivered'));
    expect(delivered).toHaveLength(1);
    expect(delivered[0].html).toContain(`https://shop.test/products/${productSlug}?review=1#reviews`);
  });

  it('4. the customer reviews it; it stays hidden until an admin approves it', async () => {
    const { POST, GET } = await import('@/app/api/products/[id]/reviews/route');
    const res = await POST(json({ rating: 4, title: 'Great drape', body: 'Heavy fabric, fits true to size.' }), ctx(productId));
    expect(res.status, JSON.stringify(await res.clone().json())).toBe(200);
    expect((await (await GET(new Request('http://x'), ctx(productId))).json()).reviews).toHaveLength(0);

    const admin = await import('@/app/api/admin/reviews/route');
    const pending = (await (await admin.GET(new Request('http://x/api/admin/reviews?status=pending'))).json()).reviews;
    const mine = pending.find((r: any) => r.product?.name === 'ZZ Review Test Tee');
    expect(mine).toMatchObject({ rating: 4, status: 'pending', profile: { email: customer.email } });

    const one = await import('@/app/api/admin/reviews/[id]/route');
    await one.PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) }), ctx(mine.id));
    const live = await (await GET(new Request('http://x'), ctx(productId))).json();
    expect(live.reviews[0]).toMatchObject({ rating: 4, title: 'Great drape', author: 'Zara T.', verified: true });
    expect(live.summary).toMatchObject({ average: 4, count: 1 });
  });

  it('5. cancelling an item emails the customer', async () => {
    const { POST: order } = await import('@/app/api/orders/route');
    const body = await (await order(json({ items: [{ variant_id: variantId, quantity: 1 }], shipping_address: address }))).json();
    orderIds.push(body.order_id);
    const { data: items } = await db.from('order_items').select('id').eq('order_id', body.order_id);
    const { POST } = await import('@/app/api/payments/razorpay/refund/route');
    expect((await POST(json({ order_id: body.order_id, item_id: items[0].id }))).status).toBe(200);
    expect(sent.some((m) => m.subject.startsWith('Item cancelled'))).toBe(true);
  });
});
