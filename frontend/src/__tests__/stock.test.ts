import { describe, expect, it } from 'vitest';
import { isVariantAvailable } from '@/lib/stock';

describe('isVariantAvailable', () => {
  it('is available when active and stock is left', () => {
    expect(isVariantAvailable({ status: 'active', stock_quantity: 3 })).toBe(true);
  });

  it('is not available when stock is 0 even if active', () => {
    expect(isVariantAvailable({ status: 'active', stock_quantity: 0 })).toBe(false);
  });

  it('is not available when inactive', () => {
    expect(isVariantAvailable({ status: 'inactive', stock_quantity: 10 })).toBe(false);
  });
});
