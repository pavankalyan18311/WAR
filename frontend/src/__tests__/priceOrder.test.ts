import { describe, expect, it, vi } from 'vitest';
import { priceOrder, CheckoutError, type PricingDeps, type VariantRecord } from '@/lib/checkout/priceOrder';

const settings = { free_shipping_threshold: 999, shipping_fee: 99, cod_enabled: true };
const variant = (over: Partial<VariantRecord> = {}): VariantRecord => ({
  id: 'v1', product_id: 'p1', sku: 'TEE-BLK-M', price: 799, status: 'active',
  product_name: 'Black Tee', product_status: 'active', available: 5, ...over,
});

const deps = (variants: VariantRecord[], couponResult: any = null): PricingDeps => ({
  loadVariants: vi.fn(async () => variants),
  loadSettings: vi.fn(async () => settings),
  checkCoupon: vi.fn(async () => couponResult),
});

describe('priceOrder', () => {
  it('prices from the database, ignoring any client price', async () => {
    const result = await priceOrder(deps([variant()]), {
      items: [{ variant_id: 'v1', quantity: 2, unit_price: 1 } as any],
    });
    expect(result.lines).toEqual([
      { variant_id: 'v1', product_id: 'p1', sku: 'TEE-BLK-M', name: 'Black Tee', quantity: 2, unit_price: 799, total_price: 1598 },
    ]);
    expect(result.totals).toEqual({ subtotal: 1598, discount: 0, shipping: 0, tax: 0, total: 1598 });
  });

  it('merges duplicate lines for the same variant', async () => {
    const result = await priceOrder(deps([variant()]), {
      items: [{ variant_id: 'v1', quantity: 1 }, { variant_id: 'v1', quantity: 2 }],
    });
    expect(result.lines[0].quantity).toBe(3);
  });

  it.each([
    [[], 'Your cart is empty.'],
    [[{ variant_id: 'v1', quantity: 0 }], 'Invalid quantity.'],
    [[{ variant_id: 'v1', quantity: 1.5 }], 'Invalid quantity.'],
  ])('rejects bad carts %#', async (items, message) => {
    await expect(priceOrder(deps([variant()]), { items })).rejects.toThrow(message);
  });

  it('allows large quantities when enough stock is available', async () => {
    const result = await priceOrder(deps([variant({ available: 25 })]), { items: [{ variant_id: 'v1', quantity: 25 }] });
    expect(result.lines[0].quantity).toBe(25);
  });

  it('rejects unknown, inactive or out-of-stock variants', async () => {
    await expect(priceOrder(deps([]), { items: [{ variant_id: 'v1', quantity: 1 }] }))
      .rejects.toThrow('no longer available');
    await expect(priceOrder(deps([variant({ status: 'inactive' })]), { items: [{ variant_id: 'v1', quantity: 1 }] }))
      .rejects.toThrow('no longer available');
    await expect(priceOrder(deps([variant({ product_status: 'draft' })]), { items: [{ variant_id: 'v1', quantity: 1 }] }))
      .rejects.toThrow('no longer available');
    await expect(priceOrder(deps([variant({ available: 1 })]), { items: [{ variant_id: 'v1', quantity: 2 }] }))
      .rejects.toThrow('Only 1 left of "Black Tee"');
  });

  it('applies a valid coupon and reports an invalid one', async () => {
    const coupon = { id: 'c1', code: 'WAR100', discount_type: 'flat', discount_value: 100, max_discount_amount: null };
    const ok = await priceOrder(deps([variant()], { coupon, error: null }), {
      items: [{ variant_id: 'v1', quantity: 1 }], couponCode: 'war100',
    });
    expect(ok.totals).toMatchObject({ subtotal: 799, discount: 100, shipping: 99, total: 798 });
    expect(ok.couponCode).toBe('WAR100');

    await expect(priceOrder(deps([variant()], { coupon: null, error: 'This coupon has expired.' }), {
      items: [{ variant_id: 'v1', quantity: 1 }], couponCode: 'OLD',
    })).rejects.toThrow('This coupon has expired.');
  });

  it('applies reward points (₹1 each) up to the product value after coupon, never shipping', async () => {
    const d = { ...deps([variant({ price: 500 })]), loadPointsBalance: vi.fn(async () => 300) };
    const r = await priceOrder(d, { items: [{ variant_id: 'v1', quantity: 1 }], pointsToUse: 300 });
    expect(r.pointsUsed).toBe(300);
    expect(r.totals).toEqual({ subtotal: 500, discount: 0, shipping: 99, tax: 0, total: 299 }); // 500 − 300 + 99

    const all = await priceOrder({ ...d, loadPointsBalance: vi.fn(async () => 5000) }, { items: [{ variant_id: 'v1', quantity: 1 }], pointsToUse: 5000 });
    expect(all.pointsUsed).toBe(500);
    expect(all.totals.total).toBe(99);
  });

  it('never uses more points than the customer really has', async () => {
    const d = { ...deps([variant({ price: 500 })]), loadPointsBalance: vi.fn(async () => 40) };
    const r = await priceOrder(d, { items: [{ variant_id: 'v1', quantity: 1 }], pointsToUse: 400 });
    expect(r.pointsUsed).toBe(40);
  });

  it('no points requested → none used, balance not even checked', async () => {
    const d = { ...deps([variant()]), loadPointsBalance: vi.fn(async () => 999) };
    const r = await priceOrder(d, { items: [{ variant_id: 'v1', quantity: 1 }] });
    expect(r.pointsUsed).toBe(0);
    expect(d.loadPointsBalance).not.toHaveBeenCalled();
  });

  it('throws CheckoutError so routes can return 400', async () => {
    await expect(priceOrder(deps([]), { items: [] })).rejects.toBeInstanceOf(CheckoutError);
  });
});
