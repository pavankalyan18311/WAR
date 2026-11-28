import { sendEmail } from '@/lib/mailer';
import { loadStoreSettings } from '@/lib/checkout/storeSettings';
import {
  itemCancelledEmail,
  orderDeliveredEmail,
  orderPlacedEmail,
  type OrderEmailData,
  type OrderEmailItem,
  type RenderedEmail,
} from './templates';

export type OrderEmailKind =
  | { kind: 'order_placed' }
  | { kind: 'order_delivered' }
  | { kind: 'item_cancelled'; itemId: string; refundAmount: number };

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

function toItem(it: any): OrderEmailItem {
  return {
    name: it.product?.name ?? 'Item',
    slug: it.product?.slug ?? null,
    size: it.variant?.size_option?.name ?? null,
    color: it.variant?.color?.name ?? null,
    quantity: Number(it.quantity),
    unitPrice: Number(it.unit_price),
  };
}

function render(data: OrderEmailData, items: any[], what: OrderEmailKind): RenderedEmail | null {
  if (what.kind === 'order_placed') return orderPlacedEmail(data);
  if (what.kind === 'order_delivered') return orderDeliveredEmail(data);
  const item = items.find((it) => it.id === what.itemId);
  return item ? itemCancelledEmail(data, toItem(item), what.refundAmount) : null;
}

/** One key per email, so repeated triggers (webhook retries, double clicks) send it once. */
const logKey = (orderId: string, what: OrderEmailKind) =>
  what.kind === 'item_cancelled' ? `item_cancelled:${what.itemId}` : `${what.kind}:${orderId}`;

/**
 * Emails the customer about their order. Best-effort: never throws, so an email problem
 * can never fail a checkout, a cancellation or a Shiprocket webhook.
 */
export async function sendOrderEmail(supabase: any, orderId: string, what: OrderEmailKind): Promise<void> {
  const key = logKey(orderId, what);
  try {
    const { error: claimError } = await supabase.from('email_log').insert({ key, order_id: orderId, kind: what.kind });
    if (claimError?.code === '23505') return; // already sent
    if (claimError) console.warn('[email] could not write email_log (run the latest migration):', claimError.message);

    const { data: order } = await supabase
      .from('orders')
      .select('*, order_items(id, quantity, unit_price, status, product:products(name, slug), variant:product_variants(color:colors(name), size_option:size_options(name)))')
      .eq('id', orderId)
      .maybeSingle();
    if (!order) return;

    const { data: profile } = await supabase.from('profiles').select('email, name').eq('id', order.user_id).maybeSingle();
    if (!profile?.email) {
      console.warn('[email] no email address for order', orderId);
      return;
    }

    const allItems = order.order_items ?? [];
    const data: OrderEmailData = {
      orderId: order.id,
      customerName: profile.name || order.shipping_address?.full_name || '',
      items: allItems.filter((it: any) => it.status !== 'cancelled').map(toItem),
      subtotal: Number(order.subtotal),
      discount: Number(order.discount ?? 0),
      shipping: Number(order.shipping ?? 0),
      total: Number(order.total),
      paymentMethod: order.payment_method,
      address: order.shipping_address ?? {},
      siteUrl: siteUrl(),
      pointsEarned: order.points_earned ?? null,
      returnDays: (await loadStoreSettings(supabase)).return_days,
    };

    const email = render(data, allItems, what);
    if (!email) return;

    const result = await sendEmail({ to: profile.email, ...email });
    // Let a later trigger try again if this one did not go out.
    if (!result.sent && !claimError) await supabase.from('email_log').delete().eq('key', key);
  } catch (err: any) {
    console.error('[email] order email failed:', key, err?.message);
  }
}
