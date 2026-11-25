import { describe, expect, it, vi } from 'vitest';
import { quoteCart } from '@/lib/checkout/quote';
import type { PricingDeps, VariantRecord } from '@/lib/checkout/priceOrder';

const v = (over: Partial<VariantRecord>): VariantRecord => ({
  id: 'v1', product_id: 'p1', sku: 'S', price: 500, status: 'active', product_name: 'Tee', product_status: 'active', available: 10, ...over,
});

function deps(variants: VariantRecord[], coupon?: (code: string, subtotal: number) => any): PricingDeps {
  return {
    loadVariants: async () => variants,
    loadSettings: async () => ({ free_shipping_threshold: 1500, shipping_fee: 99, cod_enabled: true }),
    checkCoupon: vi.fn(coupon ?? (async () => ({ coupon: null, error: 'Invalid coupon code.' }))),
  };
}

describe('quoteCart', () => {
  it('prices every line from the database (not the browser) and can check out', async () => {
    const q = await quoteCart(deps([v({ price: 650 })]), { items: [{ variant_id: 'v1', quantity: 2 }] });
    expect(q.lines).toEqual([expect.objectContaining({ variant_id: 'v1', status: 'ok', quantity: 2, unit_price: 650, available: 10 })]);
    expect(q.totals).toMatchObject({ subtotal: 1300, shipping: 99, total: 1399 });
    expect(q.canCheckout).toBe(true);
  });

  it('flags unpublished, inactive and deleted items instead of failing', async () => {
    const q = await quoteCart(deps([v({ id: 'a', product_status: 'draft' }), v({ id: 'b', status: 'inactive' }), v({ id: 'ok' })]), {
      items: [{ variant_id: 'a', quantity: 1 }, { variant_id: 'b', quantity: 1 }, { variant_id: 'gone', quantity: 1 }, { variant_id: 'ok', quantity: 1 }],
    });
    expect(q.lines.map((l) => [l.variant_id, l.status])).toEqual([['a', 'unavailable'], ['b', 'unavailable'], ['gone', 'unavailable'], ['ok', 'ok']]);
    expect(q.totals.subtotal).toBe(500); // only what can actually be bought
    expect(q.canCheckout).toBe(false);
  });

  it('reduces a line to the stock left; sold out = unavailable', async () => {
    const q = await quoteCart(deps([v({ id: 'a', available: 2 }), v({ id: 'b', available: 0 })]), {
      items: [{ variant_id: 'a', quantity: 5 }, { variant_id: 'b', quantity: 1 }],
    });
    expect(q.lines[0]).toMatchObject({ status: 'reduced', requested: 5, quantity: 2, available: 2 });
    expect(q.lines[1]).toMatchObject({ status: 'unavailable', quantity: 0 });
    expect(q.canCheckout).toBe(false);
  });

  it('re-checks the coupon against the current subtotal and reports why it no longer applies', async () => {
    const coupon = async (_code: string, subtotal: number) => subtotal >= 1000
      ? { coupon: { code: 'SAVE10', discount_type: 'percentage', discount_value: 10, max_discount_amount: null }, error: null }
      : { coupon: null, error: 'Minimum order of ₹1000 required for this coupon.' };

    const ok = await quoteCart(deps([v({})], coupon), { items: [{ variant_id: 'v1', quantity: 2 }], couponCode: 'save10' });
    expect(ok.coupon).toEqual({ code: 'SAVE10', ok: true, error: null });
    expect(ok.totals.discount).toBe(100);

    const low = await quoteCart(deps([v({})], coupon), { items: [{ variant_id: 'v1', quantity: 1 }], couponCode: 'save10' });
    expect(low.coupon).toEqual({ code: 'SAVE10', ok: false, error: 'Minimum order of ₹1000 required for this coupon.' });
    expect(low.totals.discount).toBe(0);
    expect(low.canCheckout).toBe(true); // checkout continues without the coupon once it is removed
  });

  it('handles an empty cart and bad quantities without throwing', async () => {
    const empty = await quoteCart(deps([]), { items: [] });
    expect(empty).toMatchObject({ lines: [], canCheckout: false });
    expect(empty.totals.total).toBe(0);

    const bad = await quoteCart(deps([v({})]), { items: [{ variant_id: 'v1', quantity: 0 }, { variant_id: '', quantity: 1 }] as any });
    expect(bad.lines).toEqual([]);
  });
});
