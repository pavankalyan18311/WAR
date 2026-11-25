import { describe, expect, it } from 'vitest';
import { couponDiscount, computeTotals } from '@/lib/checkout/pricing';

const settings = { free_shipping_threshold: 999, shipping_fee: 99, cod_enabled: true };

describe('couponDiscount', () => {
  it('percentage, capped by max_discount_amount', () => {
    expect(couponDiscount({ discount_type: 'percentage', discount_value: 20, max_discount_amount: 150 }, 1000)).toBe(150);
    expect(couponDiscount({ discount_type: 'percentage', discount_value: 10, max_discount_amount: null }, 1299)).toBe(130);
  });

  it('flat never exceeds the subtotal', () => {
    expect(couponDiscount({ discount_type: 'flat', discount_value: 500, max_discount_amount: null }, 300)).toBe(300);
  });

  it('free_shipping gives no money discount', () => {
    expect(couponDiscount({ discount_type: 'free_shipping', discount_value: 0, max_discount_amount: null }, 800)).toBe(0);
  });
});

describe('computeTotals', () => {
  it('charges the configured shipping fee below the threshold', () => {
    const t = computeTotals([{ unit_price: 499, quantity: 1 }], settings, null);
    expect(t).toEqual({ subtotal: 499, discount: 0, shipping: 99, tax: 0, total: 598 });
  });

  it('ships free at or above the configured threshold', () => {
    const t = computeTotals([{ unit_price: 999, quantity: 1 }], settings, null);
    expect(t.shipping).toBe(0);
    expect(t.total).toBe(999);
  });

  it('uses whatever threshold/fee the admin configured', () => {
    const t = computeTotals([{ unit_price: 1200, quantity: 1 }], { ...settings, free_shipping_threshold: 1500, shipping_fee: 79 }, null);
    expect(t.shipping).toBe(79);
  });

  it('decides free shipping on the subtotal before the coupon discount', () => {
    const coupon = { discount_type: 'flat' as const, discount_value: 100, max_discount_amount: null };
    const t = computeTotals([{ unit_price: 1000, quantity: 1 }], settings, coupon);
    expect(t).toEqual({ subtotal: 1000, discount: 100, shipping: 0, tax: 0, total: 900 });
  });

  it('free_shipping coupon removes the shipping fee', () => {
    const coupon = { discount_type: 'free_shipping' as const, discount_value: 0, max_discount_amount: null };
    const t = computeTotals([{ unit_price: 300, quantity: 2 }], settings, coupon);
    expect(t).toEqual({ subtotal: 600, discount: 0, shipping: 0, tax: 0, total: 600 });
  });
});
