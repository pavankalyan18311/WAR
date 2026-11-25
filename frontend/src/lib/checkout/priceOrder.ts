import { computeTotals, type CouponTerms, type OrderTotals, type StoreSettings } from './pricing';
import { checkCoupon, type CouponCheck } from './coupons';
import { applyPoints, getPointsBalance } from '@/lib/rewards';
import { loadStoreSettings } from './storeSettings';
export { DEFAULT_STORE_SETTINGS, loadStoreSettings } from './storeSettings';

/** A user-facing checkout problem (bad cart, stock, coupon) — routes return it as a 400. */
export class CheckoutError extends Error {}

export interface CartLineInput {
  variant_id: string;
  quantity: number;
}

export interface VariantRecord {
  id: string;
  product_id: string;
  sku: string;
  price: number;
  status: string;
  product_name: string;
  product_status: string;
  available: number;
}

export interface OrderLine {
  variant_id: string;
  product_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface PricedOrder {
  lines: OrderLine[];
  totals: OrderTotals;
  couponCode: string | null;
  settings: StoreSettings;
  /** Reward points applied (₹1 each); already taken off totals.total. */
  pointsUsed: number;
}

export interface PricingDeps {
  loadVariants: (ids: string[]) => Promise<VariantRecord[]>;
  loadSettings: () => Promise<StoreSettings>;
  checkCoupon: (code: string, subtotal: number) => Promise<CouponCheck>;
  /** Spendable reward points (only asked for when the customer wants to use points). */
  loadPointsBalance?: () => Promise<number>;
}

/** Prices a cart using only database data — never trust prices sent by the browser. */
export async function priceOrder(
  deps: PricingDeps,
  input: { items: CartLineInput[]; couponCode?: string | null; pointsToUse?: number },
): Promise<PricedOrder> {
  if (!Array.isArray(input.items) || input.items.length === 0) throw new CheckoutError('Your cart is empty.');

  const qtyByVariant = new Map<string, number>();
  for (const item of input.items) {
    const qty = Number(item.quantity);
    if (!item.variant_id || !Number.isInteger(qty) || qty < 1) {
      throw new CheckoutError('Invalid quantity.');
    }
    qtyByVariant.set(item.variant_id, (qtyByVariant.get(item.variant_id) ?? 0) + qty);
  }

  const variants = new Map((await deps.loadVariants([...qtyByVariant.keys()])).map((v) => [v.id, v]));

  const lines: OrderLine[] = [...qtyByVariant].map(([variantId, quantity]) => {
    const v = variants.get(variantId);
    if (!v || v.status !== 'active' || v.product_status !== 'active') {
      throw new CheckoutError('An item in your cart is no longer available. Please remove it and try again.');
    }
    if (v.available < quantity) {
      throw new CheckoutError(`Only ${Math.max(0, v.available)} left of "${v.product_name}". Please update your cart.`);
    }
    const unitPrice = Number(v.price);
    return {
      variant_id: v.id,
      product_id: v.product_id,
      sku: v.sku,
      name: v.product_name,
      quantity,
      unit_price: unitPrice,
      total_price: unitPrice * quantity,
    };
  });

  const settings = await deps.loadSettings();
  const subtotal = lines.reduce((s, l) => s + l.total_price, 0);

  let coupon: CouponTerms | null = null;
  let couponCode: string | null = null;
  if (input.couponCode?.trim()) {
    const check = await deps.checkCoupon(input.couponCode.trim(), subtotal);
    if (!check.coupon) throw new CheckoutError(check.error);
    coupon = check.coupon;
    couponCode = check.coupon.code.toUpperCase();
  }

  const totals = computeTotals(lines, settings, coupon);
  const requested = Math.max(0, Math.floor(Number(input.pointsToUse) || 0));
  if (requested === 0 || !deps.loadPointsBalance) return { lines, totals, couponCode, settings, pointsUsed: 0 };

  const balance = await deps.loadPointsBalance();
  const { points_used, ...withPoints } = applyPoints(totals, Math.min(requested, balance));
  return { lines, totals: withPoints, couponCode, settings, pointsUsed: points_used };
}

/** Wires priceOrder to Supabase (service-role client). */
export function supabasePricingDeps(supabase: any, userId: string | null): PricingDeps {
  return {
    loadSettings: () => loadStoreSettings(supabase),
    checkCoupon: (code, subtotal) => checkCoupon(supabase, code, subtotal, userId),
    loadPointsBalance: async () => (userId ? getPointsBalance(supabase, userId) : 0),
    loadVariants: async (ids) => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, product_id, sku, price, status, product:products(name, status), inventory(quantity, reserved_quantity)')
        .in('id', ids);
      if (error) throw error;
      return (data ?? []).map((v: any) => {
        const inv = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory;
        return {
          id: v.id,
          product_id: v.product_id,
          sku: v.sku,
          price: Number(v.price),
          status: v.status,
          product_name: v.product?.name ?? '',
          product_status: v.product?.status ?? '',
          available: inv ? Number(inv.quantity) - Number(inv.reserved_quantity ?? 0) : 0,
        };
      });
    },
  };
}
