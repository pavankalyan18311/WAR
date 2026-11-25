import type { CouponTerms } from './pricing';

export interface CouponRow extends Partial<CouponTerms> {
  id: string;
  code: string;
  description?: string | null;
  coupon_type?: string;
  is_active: boolean;
  valid_from: string | null;
  valid_to: string | null;
  min_order_amount: number;
  max_uses: number | null;
  uses_count: number;
  max_uses_per_user?: number | null;
  first_order_only?: boolean;
  inactive_days_threshold?: number | null;
}

export type CouponCheck = { coupon: CouponRow & CouponTerms; error: null } | { coupon: null; error: string };

const PLACED_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered'];

/** Rules that need only the coupon row. Returns an error message, or null when OK. */
export function checkCouponBasics(coupon: CouponRow, subtotal: number, today: string): string | null {
  if (!coupon.is_active) return 'This coupon is no longer active.';
  if (coupon.valid_from && coupon.valid_from > today) return 'This coupon is not valid yet.';
  if (coupon.valid_to && coupon.valid_to < today) return 'This coupon has expired.';
  if (subtotal < Number(coupon.min_order_amount)) {
    return `Minimum order of ₹${coupon.min_order_amount} required for this coupon.`;
  }
  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    return 'This coupon has reached its usage limit.';
  }
  return null;
}

/** Full coupon validation (basic rules + per-customer rules) against the database. */
export async function checkCoupon(supabase: any, code: string, subtotal: number, userId: string | null): Promise<CouponCheck> {
  const fail = (error: string): CouponCheck => ({ coupon: null, error });

  const { data: coupon } = await supabase.from('coupons').select('*').ilike('code', code.trim()).maybeSingle();
  if (!coupon) return fail('Invalid coupon code.');

  const basicError = checkCouponBasics(coupon, subtotal, new Date().toISOString().split('T')[0]);
  if (basicError) return fail(basicError);

  if (userId) {
    const customerError = await checkCouponForCustomer(supabase, coupon, userId);
    if (customerError) return fail(customerError);
  }

  return { coupon, error: null };
}

/** Per-customer rules (uses per customer, first order, welcome back). Error message, or null when OK. */
export async function checkCouponForCustomer(supabase: any, coupon: CouponRow, userId: string): Promise<string | null> {
  const fail = (error: string) => error;
  {
    if (coupon.max_uses_per_user !== null && coupon.max_uses_per_user !== undefined) {
      const { count } = await supabase
        .from('coupon_usages')
        .select('id', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('user_id', userId);
      if ((count ?? 0) >= coupon.max_uses_per_user) return fail('You have already used this coupon.');
    }

    const countOrders = async (since?: string) => {
      let q = supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', PLACED_STATUSES);
      if (since) q = q.gte('created_at', since);
      const { count } = await q;
      return count ?? 0;
    };

    if (coupon.first_order_only || coupon.coupon_type === 'welcome') {
      if ((await countOrders()) > 0) return fail('This coupon is only valid for your first order.');
    }

    if (coupon.coupon_type === 'welcome_back' && coupon.inactive_days_threshold) {
      const since = new Date(Date.now() - coupon.inactive_days_threshold * 86_400_000).toISOString();
      if ((await countOrders(since)) > 0) {
        return fail(`This coupon is for customers who haven't ordered in ${coupon.inactive_days_threshold} days.`);
      }
      if ((await countOrders()) === 0) return fail('This coupon is for returning customers only.');
    }
  }

  return null;
}
