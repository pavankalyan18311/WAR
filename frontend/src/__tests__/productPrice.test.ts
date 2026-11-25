import { describe, it, expect } from 'vitest';
import { priceDisplay } from '@/lib/productPrice';

describe('priceDisplay', () => {
  it('shows MRP, saving and percent when MRP is above the selling price', () => {
    expect(priceDisplay({ price: 999, compare_at_price: 1499 })).toEqual({
      price: 999, mrp: 1499, saving: 500, percent: 33,
    });
  });

  it('hides MRP when there is none', () => {
    expect(priceDisplay({ price: 999, compare_at_price: null })).toEqual({ price: 999, mrp: null, saving: 0, percent: 0 });
  });

  it('hides MRP when it is not above the selling price (no "Save ₹0")', () => {
    expect(priceDisplay({ price: 999, compare_at_price: 999 }).mrp).toBeNull();
    expect(priceDisplay({ price: 999, compare_at_price: 500 }).mrp).toBeNull();
  });
});
