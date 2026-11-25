// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let signedIn: { id: string } | null = { id: 'me' };
vi.mock('@/lib/apiAuth', () => ({
  requireUser: async () => (signedIn ? { user: signedIn, response: null }
    : { user: null, response: NextResponse.json({ error: 'Please sign in' }, { status: 401 }) }),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({}) }));

const depsFor = vi.fn();
vi.mock('@/lib/checkout/priceOrder', async (orig) => ({
  ...(await orig<any>()),
  supabasePricingDeps: (_db: any, userId: string | null) => {
    depsFor(userId);
    return {
      loadVariants: async () => [{ id: 'v1', product_id: 'p1', sku: 'S', price: 700, status: 'active', product_name: 'Tee', product_status: 'active', available: 1 }],
      loadSettings: async () => ({ free_shipping_threshold: 1500, shipping_fee: 99, cod_enabled: true }),
      checkCoupon: async () => ({ coupon: null, error: 'Invalid coupon code.' }),
    };
  },
}));

const post = async (body: unknown) =>
  (await import('@/app/api/orders/quote/route')).POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }));

describe('POST /api/orders/quote', () => {
  beforeEach(() => { signedIn = { id: 'me' }; depsFor.mockClear(); });

  it("returns the server's view of the cart (prices, stock, coupon)", async () => {
    const res = await post({ items: [{ variant_id: 'v1', quantity: 3 }], coupon_code: 'NOPE' });
    expect(res.status).toBe(200);
    const q = await res.json();
    expect(q.lines[0]).toMatchObject({ status: 'reduced', quantity: 1, unit_price: 700 });
    expect(q.coupon).toMatchObject({ ok: false, error: 'Invalid coupon code.' });
    expect(depsFor).toHaveBeenCalledWith('me');
  });

  it('works for guests too (per-customer coupon rules skipped)', async () => {
    signedIn = null;
    expect((await post({ items: [{ variant_id: 'v1', quantity: 1 }] })).status).toBe(200);
    expect(depsFor).toHaveBeenCalledWith(null);
  });

  it('a malformed body gives an empty quote, not a crash', async () => {
    const res = await (await import('@/app/api/orders/quote/route')).POST(new Request('http://x', { method: 'POST', body: 'not json' }));
    expect(res.status).toBe(200);
    expect((await res.json()).lines).toEqual([]);
  });
});
