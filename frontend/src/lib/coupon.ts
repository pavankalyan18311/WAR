import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Records that a coupon was used for an order, and increments its uses_count.
 * Call this after a successful order creation (both Razorpay and COD flows).
 * Silent — does not throw; logs warnings instead.
 */
export async function recordCouponUsage(couponCode: string, userId: string, orderId: string) {
  if (!couponCode || !userId || !orderId) return;

  try {
    const supabase = getAdminClient();

    const { data: coupon } = await supabase
      .from('coupons')
      .select('id')
      .ilike('code', couponCode.trim())
      .single();

    if (!coupon?.id) return;

    await Promise.all([
      supabase.from('coupon_usages').insert({
        coupon_id: coupon.id,
        user_id: userId,
        order_id: orderId,
      }),
      supabase.rpc('increment_coupon_uses', { coupon_id: coupon.id }),
    ]);
  } catch (err) {
    console.warn('recordCouponUsage warning:', err);
  }
}
