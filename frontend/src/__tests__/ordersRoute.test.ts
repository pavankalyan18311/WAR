import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let signedIn: { id: string; email: string } | null = { id: 'me', email: 'me@example.com' };
vi.mock('@/lib/apiAuth', () => ({
  requireUser: async () =>
    signedIn
      ? { user: signedIn, response: null }
      : { user: null, response: NextResponse.json({ error: 'Please sign in' }, { status: 401 }) },
}));

const priced = {
  lines: [{ variant_id: 'v1', product_id: 'p1', sku: 'S', name: 'Tee', quantity: 2, unit_price: 799, total_price: 1598 }],
  totals: { subtotal: 1598, discount: 0, shipping: 0, tax: 0, total: 1598 },
  couponCode: null,
  settings: { free_shipping_threshold: 999, shipping_fee: 99, cod_enabled: true },
};
const priceOrder = vi.fn();
vi.mock('@/lib/checkout/priceOrder', async (orig) => ({
  ...(await orig<any>()),
  priceOrder: (...a: any[]) => priceOrder(...a),
  supabasePricingDeps: () => ({}),
}));

const reserveStock = vi.fn();
const releaseStock = vi.fn();
const afterOrderConfirmed = vi.fn();
vi.mock('@/lib/checkout/fulfil', () => ({
  reserveStock: (...a: any[]) => reserveStock(...a),
  releaseStock: (...a: any[]) => releaseStock(...a),
  afterOrderConfirmed: (...a: any[]) => afterOrderConfirmed(...a),
}));

const redeemPoints = vi.fn(async () => true);
vi.mock('@/lib/rewards', async (orig) => ({ ...(await orig<any>()), redeemPoints: (...a: any[]) => (redeemPoints as any)(...a) }));

const deleted: string[] = [];
const inserts: Record<string, any> = {};
let orderRows: any[] = [];
const eqs: [string, string][] = [];
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      const b: any = {
        insert: (p: any) => { inserts[table] = p; return Promise.resolve({ error: null }); },
        delete: () => { deleted.push(table); return b; },
        select: () => b,
        eq: (c: string, v: string) => { eqs.push([c, v]); return b; },
        gte: (c: string, v: string) => { eqs.push([`${c}>=`, v]); return b; },
        lte: (c: string, v: string) => { eqs.push([`${c}<=`, v]); return b; },
        order: () => b,
        then: (resolve: any) => resolve({ data: orderRows, error: null }),
      };
      return b;
    },
  }),
}));

const address = {
  full_name: 'Asha Rao', phone: '9876501234', address_line_1: '12 MG Road',
  city: 'Bengaluru', state: 'Karnataka', pincode: '560001',
};
const post = (body: any) => new Request('http://x/api/orders', { method: 'POST', body: JSON.stringify(body) });
const route = () => import('@/app/api/orders/route');

describe('POST /api/orders (cash on delivery)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(inserts)) delete inserts[k];
    signedIn = { id: 'me', email: 'me@example.com' };
    priceOrder.mockResolvedValue(priced);
    reserveStock.mockResolvedValue(true);
    redeemPoints.mockResolvedValue(true);
    deleted.length = 0;
  });

  it('uses reward points: passes the request to pricing, saves points_used and spends them for this order', async () => {
    priceOrder.mockResolvedValue({ ...priced, pointsUsed: 300, totals: { ...priced.totals, total: 1298 } });
    const res = await (await route()).POST(post({ items: [{ variant_id: 'v1', quantity: 2 }], shipping_address: address, points_to_use: 300 }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(priceOrder.mock.calls[0][1]).toMatchObject({ pointsToUse: 300 });
    expect(inserts.orders).toMatchObject({ points_used: 300, total: 1298, payment_method: 'cod' });
    expect(redeemPoints).toHaveBeenCalledWith(expect.anything(), 'me', body.order_id, 300);
  });

  it('if the points were spent elsewhere meanwhile, the order is undone (no free discount)', async () => {
    priceOrder.mockResolvedValue({ ...priced, pointsUsed: 300, totals: { ...priced.totals, total: 1298 } });
    redeemPoints.mockResolvedValue(false);
    const res = await (await route()).POST(post({ items: [{ variant_id: 'v1', quantity: 2 }], shipping_address: address, points_to_use: 300 }));
    expect(res.status).toBe(409);
    expect(deleted).toContain('orders');
    expect(releaseStock).toHaveBeenCalled();
    expect(afterOrderConfirmed).not.toHaveBeenCalled();
  });

  it('an order fully paid with points is confirmed as paid (even when COD is switched off)', async () => {
    priceOrder.mockResolvedValue({ ...priced, pointsUsed: 1598, totals: { ...priced.totals, total: 0 }, settings: { ...priced.settings, cod_enabled: false } });
    const res = await (await route()).POST(post({ items: [{ variant_id: 'v1', quantity: 2 }], shipping_address: address, points_to_use: 1598 }));
    expect(res.status).toBe(200);
    expect(inserts.orders).toMatchObject({ payment_method: 'points', payment_status: 'paid', status: 'confirmed', total: 0, points_used: 1598 });
  });

  it('requires sign-in', async () => {
    signedIn = null;
    const res = await (await route()).POST(post({ items: [], shipping_address: address }));
    expect(res.status).toBe(401);
  });

  it('saves the order with server prices for the signed-in user, ignoring client totals', async () => {
    const res = await (await route()).POST(post({
      items: [{ variant_id: 'v1', quantity: 2 }],
      shipping_address: address,
      order: { total: 1, user_id: 'victim', payment_status: 'paid' },
    }));
    expect(res.status).toBe(200);
    expect(inserts.orders).toMatchObject({
      user_id: 'me', total: 1598, subtotal: 1598, shipping: 0,
      payment_method: 'cod', payment_status: 'pending', status: 'confirmed',
    });
    expect(inserts.order_items).toEqual([
      expect.objectContaining({ order_id: inserts.orders.id, variant_id: 'v1', quantity: 2, unit_price: 799, total_price: 1598 }),
    ]);
    expect(afterOrderConfirmed).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: inserts.orders.id, userId: 'me' }));
    expect((await res.json()).order_id).toBe(inserts.orders.id);
  });

  it('rejects an invalid address', async () => {
    const res = await (await route()).POST(post({ items: [{ variant_id: 'v1', quantity: 1 }], shipping_address: { ...address, pincode: '12' } }));
    expect(res.status).toBe(400);
    expect(inserts.orders).toBeUndefined();
  });

  it('refuses COD when the admin disabled it', async () => {
    priceOrder.mockResolvedValue({ ...priced, settings: { ...priced.settings, cod_enabled: false } });
    const res = await (await route()).POST(post({ items: [{ variant_id: 'v1', quantity: 1 }], shipping_address: address }));
    expect(res.status).toBe(400);
    expect(inserts.orders).toBeUndefined();
  });

  it('returns 409 and saves nothing when stock runs out', async () => {
    reserveStock.mockResolvedValue(false);
    const res = await (await route()).POST(post({ items: [{ variant_id: 'v1', quantity: 2 }], shipping_address: address }));
    expect(res.status).toBe(409);
    expect(inserts.orders).toBeUndefined();
  });
});

describe('GET /api/orders', () => {
  beforeEach(() => { eqs.length = 0; signedIn = { id: 'me', email: 'me@example.com' }; });

  it('lists only the signed-in user\'s orders, ignoring user_id in the URL', async () => {
    orderRows = [];
    await (await route()).GET(new Request('http://x/api/orders?user_id=victim'));
    expect(eqs).toContainEqual(['user_id', 'me']);
    expect(eqs).not.toContainEqual(['user_id', 'victim']);
  });

  it('finds the customer\'s own order by its short WAR- reference', async () => {
    orderRows = [{ id: 'abcdef12-1111-2222-3333-444455556666', user_id: 'me', status: 'shipped', order_items: [] }];
    const res = await (await route()).GET(new Request('http://x/api/orders?ref=war-ABCDEF12'));
    expect(eqs).toEqual([
      ['user_id', 'me'],
      ['id>=', 'abcdef12-0000-0000-0000-000000000000'],
      ['id<=', 'abcdef12-ffff-ffff-ffff-ffffffffffff'],
    ]);
    expect((await res.json()).orders[0].id).toBe('abcdef12-1111-2222-3333-444455556666');
  });

  it('finds the customer own order by its courier tracking number (AWB)', async () => {
    orderRows = [{ id: 'o1', user_id: 'me', order_items: [] }];
    const res = await (await route()).GET(new Request('http://x/api/orders?awb=%20SRK-DEV-303478447%20'));
    expect(res.status).toBe(200);
    expect(eqs).toEqual(expect.arrayContaining([['user_id', 'me'], ['tracking_number', 'SRK-DEV-303478447']]));
  });

  it('includes product photos for order thumbnails (first image by sort order)', async () => {
    orderRows = [{ id: 'o1', user_id: 'me', order_items: [{ id: 'i1', product: { name: 'Tee', slug: 'tee', product_media: [
      { storage_path: 'https://cdn/2.jpg', sort_order: 2 }, { storage_path: 'https://cdn/1.jpg', sort_order: 0 },
    ] }, variant: null }] }];
    const body = await (await (await route()).GET(new Request('http://x/api/orders'))).json();
    expect(body.orders[0].order_items[0].product.images[0]).toEqual({ url: 'https://cdn/1.jpg' });
  });

  it('rejects a malformed reference', async () => {
    const res = await (await route()).GET(new Request('http://x/api/orders?ref=DROP TABLE'));
    expect(res.status).toBe(400);
  });

  it('shows only status/tracking (no address) for someone else\'s order id', async () => {
    orderRows = [{ id: 'o9', user_id: 'someone-else', status: 'shipped', tracking_number: 'AWB1', created_at: 't', updated_at: 't', shipping_address: { phone: '999' }, total: 500 }];
    const res = await (await route()).GET(new Request('http://x/api/orders?order_id=o9'));
    const body = await res.json();
    expect(body.orders[0]).toEqual({ id: 'o9', status: 'shipped', tracking_number: 'AWB1', created_at: 't', updated_at: 't' });
  });
});
