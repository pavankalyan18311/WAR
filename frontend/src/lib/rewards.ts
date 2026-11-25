import type { OrderTotals } from '@/lib/checkout/pricing';

/** 1 point = ₹1. Points are earned when an order is delivered and stay valid for 90 days. */
export const POINTS_VALID_DAYS = 90;
const BIG_ORDER = 1000;

/**
 * Random points for an order, based on what was paid for the products (after coupon and points, no shipping):
 *  - below ₹1,000 → 1 to 50
 *  - ₹1,000 and above → 50 to 100
 */
export function pointsForOrder(amount: number, rand: () => number = Math.random): number {
  if (!(amount > 0)) return 0;
  return amount < BIG_ORDER ? 1 + Math.floor(rand() * 50) : 50 + Math.floor(rand() * 51);
}

export type TotalsWithPoints = OrderTotals & { points_used: number };

/** Applies up to `available` points (₹1 each) to the products after coupon — never to shipping. */
export function applyPoints(totals: OrderTotals, available: number): TotalsWithPoints {
  const productValue = Math.max(0, totals.subtotal - totals.discount);
  const used = Math.max(0, Math.min(Math.floor(available || 0), productValue));
  return { ...totals, points_used: used, total: Math.max(0, totals.total - used) };
}

/** Spendable points for a customer (unspent and not expired). */
export async function getPointsBalance(supabase: any, userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('reward_balance', { p_user: userId });
  if (error) {
    console.warn('reward_balance failed (run the reward points migration?):', error.message);
    return 0;
  }
  return Number(data ?? 0);
}

/** Atomically spends points for an order (oldest first). False if the balance is no longer enough. */
export async function redeemPoints(supabase: any, userId: string, orderId: string, points: number): Promise<boolean> {
  if (points <= 0) return true;
  const { data, error } = await supabase.rpc('redeem_reward_points', { p_user: userId, p_order: orderId, p_points: points });
  if (error) {
    console.error('redeem_reward_points failed:', error.message);
    return false;
  }
  return data === true;
}

/** Gives back the points an order used (cancelled / not paid). Best-effort; returns points restored. */
export async function restorePoints(supabase: any, orderId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('restore_reward_points', { p_order: orderId });
    if (error) throw error;
    return Number(data ?? 0);
  } catch (err: any) {
    console.error('restore_reward_points failed for order', orderId, err?.message);
    return 0;
  }
}

/**
 * Credits random points once an order is delivered. Safe to call repeatedly (one award per order);
 * never throws, so a points problem can't break a delivery update.
 */
export async function awardPointsOnDelivery(supabase: any, orderId: string, rand: () => number = Math.random): Promise<number> {
  try {
    const { data: order } = await supabase
      .from('orders')
      .select('id, user_id, status, total, shipping, points_earned')
      .eq('id', orderId)
      .maybeSingle();
    if (!order || order.status !== 'delivered' || order.points_earned != null) return 0;

    const paidForProducts = Math.max(0, Number(order.total) - Number(order.shipping ?? 0));
    const points = pointsForOrder(paidForProducts, rand);
    if (points <= 0) return 0;

    const expiresAt = new Date(Date.now() + POINTS_VALID_DAYS * 86_400_000).toISOString();
    const { error } = await supabase.from('reward_points').insert({
      user_id: order.user_id, order_id: order.id, kind: 'earn', points, remaining: points, expires_at: expiresAt,
    });
    if (error) {
      if (error.code !== '23505') console.error('award points failed:', error.message);
      return 0;
    }
    await supabase.from('orders').update({ points_earned: points }).eq('id', order.id);
    return points;
  } catch (err: any) {
    console.error('awardPointsOnDelivery failed:', err?.message);
    return 0;
  }
}
