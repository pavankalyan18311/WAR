import { releaseStock } from './fulfil';
import { refundRazorpayPayment, toPaise } from '@/lib/razorpayServer';
import { sendOrderEmail } from '@/lib/email/orderEmails';
import { restorePoints } from '@/lib/rewards';

export const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'processing'];

/** A cancellation that cannot happen; `status` is the HTTP status to return. */
export class CancelError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface CancelResult {
  refundId: string | null;
  refundAmount: number;
  newTotal: number;
  newStatus: string;
}

/**
 * Cancels one item of an order (before it ships): refunds online payments via Razorpay
 * (item price minus its share of the coupon; the last item also refunds shipping),
 * puts the stock back, and lowers the order total.
 */
export async function cancelOrderItem(supabase: any, order: any, itemId: string, reason: string): Promise<CancelResult> {
  if (!CANCELLABLE_STATUSES.includes(order.status)) {
    throw new CancelError(400, 'This order can no longer be cancelled.');
  }

  const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id);
  const item = (items ?? []).find((it: any) => it.id === itemId);
  if (!item) throw new CancelError(404, 'Order item not found');
  if (item.status === 'cancelled') throw new CancelError(400, 'This item has already been cancelled.');

  const isLastActiveItem = !(items ?? []).some((it: any) => it.id !== itemId && it.status !== 'cancelled');
  const itemTotal = Number(item.total_price);
  // Coupon discount and reward points are both spread across the items, so a partial cancel
  // only refunds the cash actually paid for this item.
  const reductions = Number(order.discount ?? 0) + Number(order.points_used ?? 0);
  const discountShare = Number(order.subtotal) > 0
    ? Math.round((reductions * itemTotal) / Number(order.subtotal))
    : 0;
  const refundAmount = isLastActiveItem
    ? Number(order.total)
    : Math.min(Number(order.total), itemTotal - discountShare);

  const paidOnline = order.payment_status === 'paid' && !!order.razorpay_payment_id;
  const stockWasTaken = order.payment_method === 'cod' || order.payment_status === 'paid';

  // Claim the item first (only if still active) so two simultaneous cancels can't refund twice.
  const { data: claimed } = await supabase
    .from('order_items')
    .update({ status: 'cancelled' })
    .eq('id', itemId)
    .eq('status', 'active')
    .select('id');
  if (!claimed?.length) throw new CancelError(400, 'This item has already been cancelled.');

  let refundId: string | null = null;
  if (paidOnline && refundAmount > 0) {
    try {
      const refund = await refundRazorpayPayment(order.razorpay_payment_id, toPaise(refundAmount), {
        order_id: order.id,
        item_id: itemId,
        reason,
      });
      refundId = refund.id;
    } catch (err) {
      console.error('Razorpay refund failed:', err);
      await supabase.from('order_items').update({ status: 'active' }).eq('id', itemId); // undo the claim
      throw new CancelError(502, 'We could not process the refund right now. Please try again or contact support.');
    }
  }

  if (stockWasTaken) await releaseStock(supabase, [{ variant_id: item.variant_id, quantity: item.quantity }]);

  const newTotal = Math.max(0, Number(order.total) - refundAmount);
  const newStatus = isLastActiveItem ? 'cancelled' : order.status;
  const newPaymentStatus = isLastActiveItem && paidOnline ? 'refunded' : order.payment_status;
  await supabase
    .from('orders')
    .update({ total: newTotal, status: newStatus, payment_status: newPaymentStatus, updated_at: new Date().toISOString() })
    .eq('id', order.id);

  // Keep the in-memory order in step for callers cancelling several items in a row.
  Object.assign(order, { total: newTotal, status: newStatus, payment_status: newPaymentStatus });

  // The whole order is cancelled → give back any reward points it used.
  if (isLastActiveItem && Number(order.points_used ?? 0) > 0) await restorePoints(supabase, order.id);

  const refunded = paidOnline ? refundAmount : 0;
  await sendOrderEmail(supabase, order.id, { kind: 'item_cancelled', itemId, refundAmount: refunded });

  return { refundId, refundAmount: refunded, newTotal, newStatus };
}
