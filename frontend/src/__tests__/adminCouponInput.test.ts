import { describe, expect, it } from 'vitest';
import { parseCouponInput, couponSummary, CouponInputError } from '@/lib/admin/coupons';

const base = {
  code: ' war10 ', description: '', coupon_type: 'general', discount_type: 'percentage', discount_value: '10',
  min_order_amount: '', max_discount_amount: '', max_uses: '', max_uses_per_user: '', inactive_days_threshold: '',
  is_active: true, valid_from: '', valid_to: '',
};

describe('parseCouponInput', () => {
  it('cleans a simple coupon; blanks mean "no limit", never 0', () => {
    expect(parseCouponInput(base)).toEqual({
      code: 'WAR10', description: null, coupon_type: 'general', discount_type: 'percentage', discount_value: 10,
      min_order_amount: 0, max_discount_amount: null, max_uses: null, max_uses_per_user: null,
      first_order_only: false, inactive_days_threshold: null, is_active: true, valid_from: null, valid_to: null,
    });
  });

  it('welcome coupons are first-order-only and once per customer', () => {
    expect(parseCouponInput({ ...base, coupon_type: 'welcome' })).toMatchObject({ first_order_only: true, max_uses_per_user: 1 });
  });

  it('one-time coupons are once per customer', () => {
    expect(parseCouponInput({ ...base, coupon_type: 'one_time' })).toMatchObject({ max_uses_per_user: 1 });
  });

  it('free shipping needs no discount value', () => {
    expect(parseCouponInput({ ...base, discount_type: 'free_shipping', discount_value: '' })).toMatchObject({ discount_value: 0, max_discount_amount: null });
  });

  it.each([
    [{ code: '' }, 'Enter a coupon code.'],
    [{ code: 'WAR 10!' }, 'Coupon code can only use letters and numbers (3–20 characters).'],
    [{ discount_value: '0' }, 'Enter a discount between 1% and 100%.'],
    [{ discount_value: '120' }, 'Enter a discount between 1% and 100%.'],
    [{ discount_type: 'flat', discount_value: '' }, 'Enter the discount amount in ₹.'],
    [{ min_order_amount: '-5' }, 'Minimum order must be ₹0 or more.'],
    [{ max_uses_per_user: '0' }, 'Uses per customer must be at least 1 (or leave it empty for no limit).'],
    [{ valid_from: '2026-11-10', valid_to: '2026-11-01' }, 'End date cannot be before the start date.'],
    [{ coupon_type: 'welcome_back', inactive_days_threshold: '' }, 'Enter how many days a customer must have been away (e.g. 60).'],
    [{ coupon_type: 'mystery' }, 'Choose who can use this coupon.'],
  ])('rejects %o', (override, message) => {
    expect(() => parseCouponInput({ ...base, ...override })).toThrow(new CouponInputError(message));
  });
});

describe('couponSummary', () => {
  it('explains the coupon in plain words', () => {
    expect(couponSummary(parseCouponInput({ ...base, max_discount_amount: '200', min_order_amount: '999', valid_to: '2026-10-31' })))
      .toBe('10% off (up to ₹200) on orders of ₹999 or more · anyone · until 31 Oct 2026');
    expect(couponSummary(parseCouponInput({ ...base, coupon_type: 'welcome', discount_type: 'flat', discount_value: '150' })))
      .toBe('₹150 off · first order only, once per customer · no expiry');
    expect(couponSummary(parseCouponInput({ ...base, discount_type: 'free_shipping', discount_value: '', valid_from: '2026-10-10' })))
      .toBe('Free shipping · anyone · from 10 Oct 2026');
  });
});
