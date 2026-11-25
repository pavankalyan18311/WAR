/** A problem with the coupon form the admin can fix — routes return it as a 400. */
export class CouponInputError extends Error {}

export type CouponType = 'general' | 'welcome' | 'welcome_back' | 'one_time';
export type DiscountType = 'percentage' | 'flat' | 'free_shipping';

export interface CouponInput {
  code: string;
  description: string | null;
  coupon_type: CouponType;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  max_uses: number | null;
  max_uses_per_user: number | null;
  first_order_only: boolean;
  inactive_days_threshold: number | null;
  is_active: boolean;
  valid_from: string | null;
  valid_to: string | null;
}

const COUPON_TYPES: CouponType[] = ['general', 'welcome', 'welcome_back', 'one_time'];
const DISCOUNT_TYPES: DiscountType[] = ['percentage', 'flat', 'free_shipping'];

const blank = (v: unknown) => v === null || v === undefined || String(v).trim() === '';
const num = (v: unknown) => (blank(v) ? null : Number(v));
const date = (v: unknown) => (blank(v) ? null : String(v).slice(0, 10));

/** Validates and normalises what the admin entered. Empty optional fields mean "no limit". */
export function parseCouponInput(body: any): CouponInput {
  const fail = (msg: string): never => { throw new CouponInputError(msg); };

  const code = String(body?.code ?? '').trim().toUpperCase();
  if (!code) fail('Enter a coupon code.');
  if (!/^[A-Z0-9]{3,20}$/.test(code)) fail('Coupon code can only use letters and numbers (3–20 characters).');

  const coupon_type = body?.coupon_type as CouponType;
  if (!COUPON_TYPES.includes(coupon_type)) fail('Choose who can use this coupon.');
  const discount_type = body?.discount_type as DiscountType;
  if (!DISCOUNT_TYPES.includes(discount_type)) fail('Choose a discount type.');

  let discount_value = 0;
  if (discount_type === 'percentage') {
    discount_value = Number(body.discount_value);
    if (blank(body.discount_value) || !Number.isFinite(discount_value) || discount_value < 1 || discount_value > 100) {
      fail('Enter a discount between 1% and 100%.');
    }
  } else if (discount_type === 'flat') {
    discount_value = Number(body.discount_value);
    if (blank(body.discount_value) || !Number.isFinite(discount_value) || discount_value <= 0) fail('Enter the discount amount in ₹.');
  }

  const min_order_amount = num(body.min_order_amount) ?? 0;
  if (!Number.isFinite(min_order_amount) || min_order_amount < 0) fail('Minimum order must be ₹0 or more.');

  const max_discount_amount = discount_type === 'percentage' ? num(body.max_discount_amount) : null;
  if (max_discount_amount !== null && (!Number.isFinite(max_discount_amount) || max_discount_amount <= 0)) {
    fail('Maximum discount must be more than ₹0 (or leave it empty).');
  }

  const max_uses = num(body.max_uses);
  if (max_uses !== null && (!Number.isInteger(max_uses) || max_uses < 1)) fail('Total uses must be at least 1 (or leave it empty for no limit).');

  let max_uses_per_user = num(body.max_uses_per_user);
  if (max_uses_per_user !== null && (!Number.isInteger(max_uses_per_user) || max_uses_per_user < 1)) {
    fail('Uses per customer must be at least 1 (or leave it empty for no limit).');
  }
  if (coupon_type === 'welcome' || coupon_type === 'one_time') max_uses_per_user = 1;

  let inactive_days_threshold: number | null = null;
  if (coupon_type === 'welcome_back') {
    inactive_days_threshold = num(body.inactive_days_threshold);
    if (inactive_days_threshold === null || !Number.isInteger(inactive_days_threshold) || inactive_days_threshold < 1) {
      fail('Enter how many days a customer must have been away (e.g. 60).');
    }
  }

  const valid_from = date(body.valid_from);
  const valid_to = date(body.valid_to);
  if (valid_from && valid_to && valid_to < valid_from) fail('End date cannot be before the start date.');

  return {
    code,
    description: blank(body.description) ? null : String(body.description).trim().slice(0, 200),
    coupon_type,
    discount_type,
    discount_value,
    min_order_amount,
    max_discount_amount,
    max_uses,
    max_uses_per_user,
    first_order_only: coupon_type === 'welcome',
    inactive_days_threshold,
    is_active: body.is_active !== false,
    valid_from,
    valid_to,
  };
}

const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const WHO: Record<CouponType, string> = {
  general: 'anyone',
  welcome: 'first order only, once per customer',
  welcome_back: 'returning customers',
  one_time: 'once per customer',
};

/** Plain-English one-liner shown under the form and in the coupon list. */
export function couponSummary(c: CouponInput): string {
  const what = c.discount_type === 'free_shipping'
    ? 'Free shipping'
    : c.discount_type === 'flat'
      ? `₹${c.discount_value} off`
      : `${c.discount_value}% off${c.max_discount_amount ? ` (up to ₹${c.max_discount_amount})` : ''}`;
  const min = c.min_order_amount > 0 ? ` on orders of ₹${c.min_order_amount} or more` : '';
  const who = c.coupon_type === 'welcome_back' && c.inactive_days_threshold
    ? `customers who haven't ordered in ${c.inactive_days_threshold} days`
    : WHO[c.coupon_type];
  const when = c.valid_from && c.valid_to
    ? `${fmtDate(c.valid_from)} – ${fmtDate(c.valid_to)}`
    : c.valid_to ? `until ${fmtDate(c.valid_to)}` : c.valid_from ? `from ${fmtDate(c.valid_from)}` : 'no expiry';
  return `${what}${min} · ${who} · ${when}`;
}
