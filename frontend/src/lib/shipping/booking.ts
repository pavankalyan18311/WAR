import { isAbandonedPayment } from '@/lib/admin/orders';

/** Admin → Settings → Shiprocket. */
export interface ShippingPartnerSettings {
  /** Name of the pickup address exactly as saved in Shiprocket → Settings → Pickup Addresses */
  pickup_location: string;
  /** Packed weight of ONE item; multiplied by the number of items */
  weight_kg: number;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
  /** Let Shiprocket pick the courier and create the AWB, pickup and label automatically */
  auto_assign: boolean;
}

export const DEFAULT_SHIPPING_PARTNER: ShippingPartnerSettings = {
  pickup_location: 'Primary', weight_kg: 0.3, length_cm: 30, breadth_cm: 25, height_cm: 3, auto_assign: true,
};

export async function loadShippingPartnerSettings(supabase: any): Promise<ShippingPartnerSettings> {
  const { data } = await supabase
    .from('store_settings')
    .select('shiprocket_pickup_location, parcel_weight_kg, parcel_length_cm, parcel_breadth_cm, parcel_height_cm, shiprocket_auto_assign')
    .eq('id', 1)
    .maybeSingle();
  if (!data) return DEFAULT_SHIPPING_PARTNER;
  return {
    pickup_location: data.shiprocket_pickup_location || DEFAULT_SHIPPING_PARTNER.pickup_location,
    weight_kg: Number(data.parcel_weight_kg) || DEFAULT_SHIPPING_PARTNER.weight_kg,
    length_cm: Number(data.parcel_length_cm) || DEFAULT_SHIPPING_PARTNER.length_cm,
    breadth_cm: Number(data.parcel_breadth_cm) || DEFAULT_SHIPPING_PARTNER.breadth_cm,
    height_cm: Number(data.parcel_height_cm) || DEFAULT_SHIPPING_PARTNER.height_cm,
    auto_assign: data.shiprocket_auto_assign !== false,
  };
}

/** The Shiprocket calls booking needs (real API in production, sandbox in development, fakes in tests). */
export interface ShippingPartnerApi {
  createOrder: (payload: any) => Promise<{ success: boolean; order_id?: number | string; shipment_id?: number | string; awb_code?: string; courier_name?: string; error?: string }>;
  assignAwb: (shipmentId: string) => Promise<{ success: boolean; awb_code?: string; courier_name?: string; error?: string }>;
  schedulePickup: (shipmentId: string) => Promise<{ success: boolean; error?: string }>;
  generateLabel: (shipmentId: string) => Promise<{ success: boolean; label_url?: string; error?: string }>;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Shiprocket "create order" body built from our saved order (cancelled items left out). */
export function buildShipmentPayload(order: any, customerEmail: string, s: ShippingPartnerSettings) {
  const a = order.shipping_address ?? {};
  const [first = '', ...rest] = String(a.full_name ?? '').trim().split(/\s+/);
  const items = (order.order_items ?? [])
    .filter((it: any) => it.status !== 'cancelled')
    .map((it: any) => ({
      name: it.product?.name ?? 'Item',
      sku: it.variant?.sku ?? it.product?.name ?? 'ITEM',
      units: Number(it.quantity),
      selling_price: Number(it.unit_price),
    }));
  const units = items.reduce((n: number, it: any) => n + it.units, 0);
  const subTotal = items.reduce((n: number, it: any) => n + it.units * it.selling_price, 0);
  const created = new Date(order.created_at);
  const orderDate = new Date(created.getTime() + 330 * 60_000).toISOString().replace('T', ' ').slice(0, 16); // India time

  return {
    order_id: order.id,
    order_date: orderDate,
    pickup_location: s.pickup_location,
    billing_customer_name: first,
    billing_last_name: rest.join(' '),
    billing_address: a.address_line_1 ?? '',
    billing_address_2: a.address_line_2 ?? '',
    billing_city: a.city ?? '',
    billing_pincode: String(a.pincode ?? ''),
    billing_state: a.state ?? '',
    billing_country: a.country || 'India',
    billing_email: customerEmail,
    billing_phone: String(a.phone ?? '').replace(/\D/g, '').slice(-10),
    shipping_is_billing: true,
    order_items: items,
    // Cash on delivery collects what the customer owes; points and online payments are already paid.
    payment_method: order.payment_method === 'cod' ? 'COD' : 'Prepaid',
    sub_total: subTotal,
    shipping_charges: Number(order.shipping ?? 0),
    total_discount: Number(order.discount ?? 0) + Number(order.points_used ?? 0),
    length: s.length_cm,
    breadth: s.breadth_cm,
    height: s.height_cm,
    weight: Math.max(0.1, round3(s.weight_kg * Math.max(1, units))),
  };
}

export type BookingResult =
  | { status: 'ready' }      // courier assigned, tracking number saved
  | { status: 'created' }    // in Shiprocket; courier not (yet) assigned
  | { status: 'skipped' }    // cancelled / unpaid — nothing to ship
  | { status: 'failed'; error: string };

/**
 * Sends a confirmed order to Shiprocket and (if auto-assign is on) gets the courier, AWB, pickup and label.
 * Safe to run again: it continues from the last successful step and never creates a duplicate shipment.
 * Problems are saved on the order (orders.shipping_error) for Admin → Orders.
 */
export async function bookShipment(
  supabase: any,
  orderId: string,
  customerEmail: string,
  settings: ShippingPartnerSettings,
  api: ShippingPartnerApi,
): Promise<BookingResult> {
  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(quantity, unit_price, status, product:products(name), variant:product_variants(sku))')
    .eq('id', orderId)
    .maybeSingle();
  if (!order) return { status: 'failed', error: 'Order not found.' };
  if (['cancelled', 'refunded'].includes(order.status) || isAbandonedPayment(order)) return { status: 'skipped' };

  const save = (patch: Record<string, unknown>) => supabase.from('orders').update(patch).eq('id', orderId);

  let shipmentId: string | null = order.shiprocket_shipment_id ?? null;
  if (!shipmentId) {
    const created = await api.createOrder(buildShipmentPayload(order, customerEmail, settings));
    if (!created.success || !created.shipment_id) {
      const error = created.error || 'Shiprocket did not accept the order.';
      await save({ shipping_error: `Could not send to Shiprocket: ${error}` });
      return { status: 'failed', error };
    }
    shipmentId = String(created.shipment_id);
    await save({
      shiprocket_order_id: created.order_id != null ? String(created.order_id) : null,
      shiprocket_shipment_id: shipmentId,
      ...(created.awb_code ? { tracking_number: created.awb_code, courier_name: created.courier_name ?? null } : {}),
      shipping_error: null,
    });
    if (created.awb_code) order.tracking_number = created.awb_code;
  }

  if (order.tracking_number) return { status: 'ready' };
  if (!settings.auto_assign) return { status: 'created' };

  const awb = await api.assignAwb(shipmentId);
  if (!awb.success || !awb.awb_code) {
    await save({ shipping_error: `In Shiprocket, but no courier assigned yet: ${awb.error || 'unknown reason'}. Assign it in Shiprocket or retry.` });
    return { status: 'created' };
  }
  await save({ tracking_number: awb.awb_code, courier_name: awb.courier_name ?? null, shipping_error: null });

  // Pickup and label are conveniences: a failure here is noted but the shipment is ready.
  const pickup = await api.schedulePickup(shipmentId);
  const label = await api.generateLabel(shipmentId);
  const notes = [
    !pickup.success && `Pickup not scheduled (${pickup.error || 'unknown'}) — schedule it in Shiprocket.`,
    !label.success && `Label not generated (${label.error || 'unknown'}) — download it in Shiprocket.`,
  ].filter(Boolean).join(' ');
  await save({ shipping_label_url: label.label_url ?? null, shipping_error: notes || null });
  return { status: 'ready' };
}
