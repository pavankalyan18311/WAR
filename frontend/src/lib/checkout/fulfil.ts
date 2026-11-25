import { assignAwb, createShiprocketOrder, generateLabel, schedulePickup } from '@/lib/shiprocket';
import { bookShipment, loadShippingPartnerSettings, type BookingResult } from '@/lib/shipping/booking';
import { recordCouponUsage } from '@/lib/coupon';
import { sendOrderEmail } from '@/lib/email/orderEmails';

interface StockLine {
  variant_id: string;
  quantity: number;
}

/** Atomically takes stock for every line; if any line is short, gives back what was taken. */
export async function reserveStock(supabase: any, lines: StockLine[]): Promise<boolean> {
  const taken: StockLine[] = [];
  for (const line of lines) {
    const { data: ok, error } = await supabase.rpc('decrement_inventory', {
      p_variant_id: line.variant_id,
      p_qty: line.quantity,
    });
    if (error || !ok) {
      await releaseStock(supabase, taken);
      return false;
    }
    taken.push(line);
  }
  return true;
}

export async function releaseStock(supabase: any, lines: StockLine[]): Promise<void> {
  for (const line of lines) {
    await supabase.rpc('increment_inventory', { p_variant_id: line.variant_id, p_qty: line.quantity });
  }
}

/**
 * Sends the order to Shiprocket and, if auto-assign is on, gets the courier, AWB, pickup and label.
 * Never throws; problems are saved on the order for Admin → Orders (where it can be retried).
 */
export async function dispatchShipment(supabase: any, orderId: string, customerEmail: string): Promise<BookingResult> {
  try {
    const settings = await loadShippingPartnerSettings(supabase);
    const result = await bookShipment(supabase, orderId, customerEmail, settings, {
      createOrder: createShiprocketOrder,
      assignAwb,
      schedulePickup,
      generateLabel,
    });
    if (result.status === 'failed') console.error('[dispatchShipment] Shiprocket booking failed for order', orderId, result.error);
    return result;
  } catch (err: any) {
    console.error('[dispatchShipment] exception for order', orderId, err?.message);
    return { status: 'failed', error: err?.message || 'Shipment booking failed.' };
  }
}

/** Everything that happens once an order is confirmed (COD placed, or online payment verified). */
export async function afterOrderConfirmed(
  supabase: any,
  order: { id: string; userId: string; couponCode: string | null; customerEmail: string },
): Promise<void> {
  if (order.couponCode) await recordCouponUsage(order.couponCode, order.userId, order.id);
  await dispatchShipment(supabase, order.id, order.customerEmail);
  await sendOrderEmail(supabase, order.id, { kind: 'order_placed' });
}
