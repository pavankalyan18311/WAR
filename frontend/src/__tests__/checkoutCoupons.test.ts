import { describe, expect, it } from 'vitest';
import { checkCouponBasics } from '@/lib/checkout/coupons';

const base = {
  id: 'c1', code: 'WAR10', is_active: true, valid_from: null, valid_to: null,
  min_order_amount: 0, max_uses: null, uses_count: 0,
};
const today = '2026-10-07';

describe('checkCouponBasics', () => {
  it('accepts an active coupon with no limits', () => {
    expect(checkCouponBasics(base, 500, today)).toBeNull();
  });

  it.each([
    [{ is_active: false }, 'This coupon is no longer active.'],
    [{ valid_from: '2026-10-08' }, 'This coupon is not valid yet.'],
    [{ valid_to: '2026-10-06' }, 'This coupon has expired.'],
    [{ min_order_amount: 999 }, 'Minimum order of ₹999 required for this coupon.'],
    [{ max_uses: 5, uses_count: 5 }, 'This coupon has reached its usage limit.'],
  ])('rejects %o', (override, message) => {
    expect(checkCouponBasics({ ...base, ...override }, 500, today)).toBe(message);
  });

  it('is still valid on its last day', () => {
    expect(checkCouponBasics({ ...base, valid_to: today }, 500, today)).toBeNull();
  });
});
