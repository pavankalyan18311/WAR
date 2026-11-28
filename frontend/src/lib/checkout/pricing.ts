export interface StoreSettings {
  free_shipping_threshold: number;
  shipping_fee: number;
  cod_enabled: boolean;
  /** Return / size-exchange window in days (Admin → Settings). Missing → 7. */
  return_days?: number;
}

export interface CouponTerms {
  discount_type: 'percentage' | 'flat' | 'free_shipping';
  discount_value: number;
  max_discount_amount: number | null;
}

export interface PricedLine {
  unit_price: number;
  quantity: number;
}

export interface OrderTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
}

export function couponDiscount(coupon: CouponTerms, subtotal: number): number {
  if (coupon.discount_type === 'free_shipping') return 0;
  if (coupon.discount_type === 'flat') return Math.min(Number(coupon.discount_value), subtotal);
  const raw = Math.round((subtotal * Number(coupon.discount_value)) / 100);
  return coupon.max_discount_amount ? Math.min(raw, Number(coupon.max_discount_amount)) : raw;
}

/** The single source of truth for order money maths (cart preview and server checkout). */
export function computeTotals(lines: PricedLine[], settings: StoreSettings, coupon: CouponTerms | null): OrderTotals {
  const subtotal = lines.reduce((sum, l) => sum + Number(l.unit_price) * l.quantity, 0);
  const discount = coupon ? couponDiscount(coupon, subtotal) : 0;
  const freeShipping =
    subtotal === 0 ||
    subtotal >= Number(settings.free_shipping_threshold) ||
    coupon?.discount_type === 'free_shipping';
  const shipping = freeShipping ? 0 : Number(settings.shipping_fee);
  const tax = 0; // Prices are GST-inclusive.

  return { subtotal, discount, shipping, tax, total: Math.max(0, subtotal - discount + shipping + tax) };
}
