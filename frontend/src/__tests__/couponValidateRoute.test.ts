import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let signedIn: { id: string } | null = { id: 'me' };
vi.mock('@/lib/apiAuth', () => ({
  requireUser: async () =>
    signedIn
      ? { user: signedIn, response: null }
      : { user: null, response: NextResponse.json({ error: 'Please sign in' }, { status: 401 }) },
}));

const checkCoupon = vi.fn();
vi.mock('@/lib/checkout/coupons', () => ({ checkCoupon: (...a: any[]) => checkCoupon(...a) }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({}) }));

const route = () => import('@/app/api/coupons/validate/route');
const post = (body: any) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) });

describe('POST /api/coupons/validate', () => {
  beforeEach(() => { vi.clearAllMocks(); signedIn = { id: 'me' }; });

  it('requires sign-in', async () => {
    signedIn = null;
    expect((await (await route()).POST(post({ code: 'X', subtotal: 100 }))).status).toBe(401);
  });

  it('checks per-customer rules for the signed-in user, not a user_id from the body', async () => {
    checkCoupon.mockResolvedValue({
      coupon: { id: 'c1', code: 'war10', description: null, discount_type: 'percentage', discount_value: 10, max_discount_amount: null },
      error: null,
    });
    const res = await (await route()).POST(post({ code: 'war10', subtotal: 1000, user_id: 'victim' }));
    const body = await res.json();
    expect(checkCoupon).toHaveBeenCalledWith(expect.anything(), 'war10', 1000, 'me');
    expect(body).toMatchObject({ valid: true, discount: 100, free_shipping: false, coupon: { code: 'WAR10' } });
  });

  it('returns the rule error for an invalid coupon', async () => {
    checkCoupon.mockResolvedValue({ coupon: null, error: 'This coupon has expired.' });
    const body = await (await (await route()).POST(post({ code: 'OLD', subtotal: 1000 }))).json();
    expect(body).toEqual({ valid: false, error: 'This coupon has expired.' });
  });
});
