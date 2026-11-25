import { computeTotals, type CouponTerms, type OrderTotals } from './pricing';
import type { CartLineInput, PricingDeps } from './priceOrder';

export type QuoteLineStatus = 'ok' | 'reduced' | 'unavailable';

export interface QuoteLine {
  variant_id: string;
  status: QuoteLineStatus;
  /** What the cart asked for */
  requested: number;
  /** What can actually be bought (0 when unavailable) */
  quantity: number;
  available: number;
  unit_price: number;
  name: string;
}

export interface CartQuote {
  lines: QuoteLine[];
  totals: OrderTotals;
  coupon: { code: string; ok: boolean; error: string | null } | null;
  /** False while any line is unavailable/reduced (the customer must review the cart) or the cart is empty. */
  canCheckout: boolean;
}

/**
 * Like priceOrder, but never throws for cart problems: it reports each line's status so the
 * cart can show "No longer available" / "Only N left" and the server's current prices.
 */
export async function quoteCart(deps: PricingDeps, input: { items: CartLineInput[]; couponCode?: string | null }): Promise<CartQuote> {
  const qtyByVariant = new Map<string, number>();
  for (const item of Array.isArray(input.items) ? input.items : []) {
    const qty = Number(item?.quantity);
    if (!item?.variant_id || !Number.isInteger(qty) || qty < 1) continue;
    qtyByVariant.set(item.variant_id, (qtyByVariant.get(item.variant_id) ?? 0) + qty);
  }

  const variants = qtyByVariant.size
    ? new Map((await deps.loadVariants([...qtyByVariant.keys()])).map((v) => [v.id, v]))
    : new Map();

  const lines: QuoteLine[] = [...qtyByVariant].map(([variantId, requested]) => {
    const v = variants.get(variantId);
    const sellable = !!v && v.status === 'active' && v.product_status === 'active';
    const available = sellable ? Math.max(0, v!.available) : 0;
    const quantity = Math.min(requested, available);
    return {
      variant_id: variantId,
      status: quantity === 0 ? 'unavailable' : quantity < requested ? 'reduced' : 'ok',
      requested,
      quantity,
      available,
      unit_price: v ? Number(v.price) : 0,
      name: v?.product_name ?? '',
    };
  });

  const buyable = lines.filter((l) => l.quantity > 0);
  const settings = await deps.loadSettings();
  const subtotal = buyable.reduce((s, l) => s + l.unit_price * l.quantity, 0);

  let coupon: CartQuote['coupon'] = null;
  let terms: CouponTerms | null = null;
  const code = input.couponCode?.trim();
  if (code && buyable.length) {
    const check = await deps.checkCoupon(code, subtotal);
    if (check.coupon) {
      terms = check.coupon;
      coupon = { code: check.coupon.code.toUpperCase(), ok: true, error: null };
    } else {
      coupon = { code: code.toUpperCase(), ok: false, error: check.error };
    }
  }

  return {
    lines,
    totals: computeTotals(buyable, settings, terms),
    coupon,
    canCheckout: lines.length > 0 && lines.every((l) => l.status === 'ok'),
  };
}
