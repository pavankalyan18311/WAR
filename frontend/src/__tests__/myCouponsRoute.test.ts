// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let signedIn: { id: string } | null = { id: 'me' };
vi.mock('@/lib/apiAuth', () => ({
  requireUser: async () =>
    signedIn ? { user: signedIn, response: null }
      : { user: null, response: NextResponse.json({ error: 'Please sign in' }, { status: 401 }) },
}));

const base = {
  description: 'INTERNAL: Instagram giveaway', is_active: true, valid_from: null, valid_to: null,
  min_order_amount: 0, max_uses: null, uses_count: 0, max_uses_per_user: null, first_order_only: false,
  inactive_days_threshold: null, discount_type: 'percentage', discount_value: 10, max_discount_amount: null,
};
let coupons: any[] = [];
let usagesByCoupon: Record<string, number> = {};
let placedOrders = 0;

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      const filters: Record<string, any> = {};
      const b: any = {
        select: () => b, order: () => b, in: () => b, gte: () => b,
        eq: (k: string, v: any) => { filters[k] = v; return b; },
        then: (r: any) => {
          if (table === 'coupons') return r({ data: coupons.filter((c) => c.is_active), error: null });
          if (table === 'coupon_usages') return r({ count: usagesByCoupon[filters.coupon_id] ?? 0, error: null });
          return r({ count: placedOrders, error: null }); // orders
        },
      };
      return b;
    },
  }),
}));

const get = async () => (await import('@/app/api/coupons/route')).GET();

describe('GET /api/coupons (customer account)', () => {
  beforeEach(() => {
    signedIn = { id: 'me' }; usagesByCoupon = {}; placedOrders = 0;
    coupons = [
      { ...base, id: 'c1', code: 'ONCE10', coupon_type: 'one_time', max_uses_per_user: 1 },
      { ...base, id: 'c2', code: 'EVERYONE5', coupon_type: 'general', discount_value: 5 },
      { ...base, id: 'c3', code: 'SOLDOUT', coupon_type: 'general', max_uses: 10, uses_count: 10 },
      { ...base, id: 'c4', code: 'WELCOME', coupon_type: 'welcome', first_order_only: true, max_uses_per_user: 1 },
      { ...base, id: 'c5', code: 'EXPIRED', coupon_type: 'general', valid_to: '2020-01-01' },
    ];
  });

  it('requires sign-in', async () => {
    signedIn = null;
    expect((await get()).status).toBe(401);
  });

  it('hides a once-per-customer coupon after this customer has used it', async () => {
    usagesByCoupon = { c1: 1 };
    const codes = (await (await get()).json()).coupons.map((c: any) => c.code);
    expect(codes).not.toContain('ONCE10');
    expect(codes).toContain('EVERYONE5');
  });

  it('hides used-up and expired coupons, and first-order coupons for returning customers', async () => {
    placedOrders = 2;
    const codes = (await (await get()).json()).coupons.map((c: any) => c.code);
    expect(codes).toEqual(['ONCE10', 'EVERYONE5']);
  });

  it('shows a customer-friendly title, never the internal team note', async () => {
    const body = await (await get()).json();
    const everyone = body.coupons.find((c: any) => c.code === 'EVERYONE5');
    expect(everyone.title).toBe('5% OFF');
    expect(JSON.stringify(body)).not.toContain('INTERNAL');
  });
});
