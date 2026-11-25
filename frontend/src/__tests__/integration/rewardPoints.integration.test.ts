// @vitest-environment node
/**
 * Live check of reward points against the real Supabase (2026_10_12 migration):
 * earn on delivery → spend at checkout → restore on cancel / closed payment window → expiry.
 * Temporary customer, product and orders are deleted at the end. Emails are captured, not sent.
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

const customer = { id: '', email: `zz-points-${Date.now()}@example.com` };
vi.mock('@/lib/apiAuth', () => ({
  requireUser: async () => ({ user: { id: customer.id, email: customer.email }, response: null }),
  requireAdmin: async () => ({ user: { id: 'integration-admin' }, response: null }),
}));
vi.mock('@/lib/mailer', () => ({ sendEmail: async () => ({ sent: true }) }));

const enabled = process.env.RUN_INTEGRATION === '1';
vi.setConfig({ testTimeout: 60_000 });
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) as any;
const json = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) });
const address = { full_name: 'ZZ Points', phone: '9876501234', address_line_1: '1 Test Street', city: 'Pune', state: 'Maharashtra', pincode: '411001' };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

let productId = '';
let variantId = '';
const orderIds: string[] = [];
const balance = async () => (await db.rpc('reward_balance', { p_user: customer.id })).data as number;

describe.skipIf(!enabled)('Reward points (live)', () => {
  beforeAll(async () => {
    const { data: u, error } = await db.auth.admin.createUser({ email: customer.email, email_confirm: true, password: `Zz!${Date.now()}` });
    if (error) throw error;
    customer.id = u.user.id;
    await db.from('profiles').upsert({ id: customer.id, email: customer.email, name: 'ZZ Points', role: 'customer' });
    const { data: size } = await db.from('size_options').select('id').limit(1).single();
    const { saveProduct } = await import('@/lib/admin/products');
    productId = await saveProduct(db, {
      name: 'ZZ Points Tee', description: null, fabric: null, fit: null, pattern: null, sleeve_type: null, neck_type: null,
      gender: null, status: 'active', category_ids: [], collection_ids: [], images: [],
      variants: [{ color_id: null, size_option_id: size.id, price: 1200, compare_at_price: null, stock: 20 }],
    });
    variantId = (await db.from('product_variants').select('id').eq('product_id', productId).single()).data.id;
  }, 60_000);

  afterAll(async () => {
    await db.from('reward_points').delete().eq('user_id', customer.id);
    for (const id of orderIds) {
      await db.from('email_log').delete().eq('order_id', id);
      await db.from('order_items').delete().eq('order_id', id);
      await db.from('orders').delete().eq('id', id);
    }
    if (productId) {
      await db.from('inventory').delete().eq('variant_id', variantId);
      await db.from('product_variants').delete().eq('product_id', productId);
      await db.from('products').delete().eq('id', productId);
    }
    if (customer.id) await db.auth.admin.deleteUser(customer.id);
  }, 60_000);

  it('1. a delivered ₹1,200 order earns 50–100 points, only once', async () => {
    const { POST } = await import('@/app/api/orders/route');
    const body = await (await POST(json({ items: [{ variant_id: variantId, quantity: 1 }], shipping_address: address }))).json();
    orderIds.push(body.order_id);

    const { PATCH } = await import('@/app/api/admin/orders/[id]/route');
    const patch = () => PATCH(new Request('http://x', { method: 'PATCH', body: JSON.stringify({ status: 'delivered' }) }), ctx(body.order_id));
    await patch();
    await patch(); // repeated delivery update

    const earned = await balance();
    expect(earned).toBeGreaterThanOrEqual(50);
    expect(earned).toBeLessThanOrEqual(100);
    const { data: rows } = await db.from('reward_points').select('kind').eq('user_id', customer.id);
    expect(rows).toHaveLength(1);
  });

  it('2. points are spent on a COD order and come back when it is cancelled', async () => {
    const before = await balance();
    const { POST } = await import('@/app/api/orders/route');
    const res = await POST(json({ items: [{ variant_id: variantId, quantity: 1 }], shipping_address: address, points_to_use: 30 }));
    const body = await res.json();
    expect(res.status, JSON.stringify(body)).toBe(200);
    orderIds.push(body.order_id);
    expect(body.points_used).toBe(30);
    // points come off the products only — shipping (if any) is still charged
    expect(body.totals.total).toBe(body.totals.subtotal - body.totals.discount + body.totals.shipping - 30);
    expect(await balance()).toBe(before - 30);

    const { data: items } = await db.from('order_items').select('id').eq('order_id', body.order_id);
    const refund = await import('@/app/api/payments/razorpay/refund/route');
    expect((await refund.POST(json({ order_id: body.order_id, item_id: items[0].id }))).status).toBe(200);
    expect(await balance()).toBe(before);
  });

  it('3. asking for more points than you have uses only what you have; the server never trusts the browser', async () => {
    const have = await balance();
    const { POST } = await import('@/app/api/orders/route');
    const body = await (await POST(json({ items: [{ variant_id: variantId, quantity: 1 }], shipping_address: address, points_to_use: 99999 }))).json();
    orderIds.push(body.order_id);
    expect(body.points_used).toBe(have);
    expect(await balance()).toBe(0);
    // give them back for the next test
    const { data: items } = await db.from('order_items').select('id').eq('order_id', body.order_id);
    const refund = await import('@/app/api/payments/razorpay/refund/route');
    await refund.POST(json({ order_id: body.order_id, item_id: items[0].id }));
    expect(await balance()).toBe(have);
  });

  it('4. expired points cannot be used', async () => {
    const have = await balance();
    await db.from('reward_points').insert({
      user_id: customer.id, kind: 'earn', points: 500, remaining: 500, expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    expect(await balance()).toBe(have);
  });

  it('4b. Razorpay (test mode): points are held when payment starts and returned when the window is closed', async () => {
    const have = await balance();
    const create = await import('@/app/api/payments/razorpay/create-order/route');
    const res = await create.POST(json({ items: [{ variant_id: variantId, quantity: 1 }], shipping_address: address, points_to_use: 20 }));
    const body = await res.json();
    expect(res.status, JSON.stringify(body)).toBe(200);
    orderIds.push(body.order_id);
    expect(body.points_used).toBe(20);
    expect(body.amount).toBe((body.totals.total) * 100);
    expect(await balance()).toBe(have - 20);

    const release = await import('@/app/api/orders/release-points/route');
    expect(await (await release.POST(json({ order_id: body.order_id }))).json()).toEqual({ restored: 20 });
    expect(await balance()).toBe(have);
    // releasing twice gives nothing extra
    expect((await (await release.POST(json({ order_id: body.order_id }))).json()).restored).toBe(0);
    expect(await balance()).toBe(have);
  });

  it('5. two orders racing for the same points: only one gets them', async () => {
    const have = await balance();
    const { POST } = await import('@/app/api/orders/route');
    const place = () => POST(json({ items: [{ variant_id: variantId, quantity: 1 }], shipping_address: address, points_to_use: have }));
    const [a, b] = await Promise.all([place(), place()]);
    const bodies = await Promise.all([a.json(), b.json()]);
    for (const x of bodies) if (x.order_id) orderIds.push(x.order_id);
    const usedTotal = bodies.reduce((s, x) => s + (x.points_used ?? 0), 0);
    expect(usedTotal).toBeLessThanOrEqual(have);
    expect(await balance()).toBe(have - usedTotal);
    expect(await balance()).toBeGreaterThanOrEqual(0);
  });
});
