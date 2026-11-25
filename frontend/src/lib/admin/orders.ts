import { orderReference } from '@/lib/checkout/client';

export interface AdminOrderItem {
  id: string;
  name: string;
  variant: string;
  quantity: number;
  total: number;
  cancelled: boolean;
}

export interface AdminOrderRow {
  id: string;
  reference: string;
  date: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  units: number;
  total: number;
  status: string;
  payment: string;
  paymentStatus: string;
  tracking: string;
  items: AdminOrderItem[];
  /** Online payment started but never completed (customer closed Razorpay). Hidden from the main list. */
  abandoned: boolean;
  /** Shiprocket: courier name, label PDF, whether the order exists in Shiprocket, and the last booking problem */
  courier: string;
  labelUrl: string;
  inShiprocket: boolean;
  shippingError: string;
}

/** An online order that was never paid (status still pending, payment not paid). COD orders never count. */
export function isAbandonedPayment(o: { status?: string; payment_method?: string; payment_status?: string }): boolean {
  return o.status === 'pending' && o.payment_method !== 'cod' && o.payment_status !== 'paid';
}

/** Admin list row built only from the saved order (blank when a detail is missing). */
export function toAdminOrderRow(o: any): AdminOrderRow {
  const a = o.shipping_address ?? {};
  const items: AdminOrderItem[] = (o.order_items ?? []).map((it: any) => ({
    id: it.id,
    name: it.product?.name ?? '',
    variant: [it.variant?.color?.name, it.variant?.size_option?.name].filter(Boolean).join(' / '),
    quantity: Number(it.quantity),
    total: Number(it.total_price),
    cancelled: it.status === 'cancelled',
  }));
  const place = [a.address_line_1, a.address_line_2, a.city, a.state].filter(Boolean).join(', ');

  return {
    id: o.id,
    reference: orderReference(o.id),
    date: String(o.created_at).slice(0, 10),
    customer: a.full_name ?? '',
    email: o.profile?.email ?? '',
    phone: a.phone ?? '',
    address: place ? `${place}${a.pincode ? ` - ${a.pincode}` : ''}` : '',
    units: items.filter((i) => !i.cancelled).reduce((s, i) => s + i.quantity, 0),
    total: Number(o.total),
    status: o.status,
    payment: `${String(o.payment_method ?? '').toUpperCase()} (${o.payment_status})`,
    paymentStatus: o.payment_status,
    tracking: o.tracking_number ?? '',
    items,
    abandoned: isAbandonedPayment(o),
    courier: o.courier_name ?? '',
    labelUrl: o.shipping_label_url ?? '',
    inShiprocket: !!o.shiprocket_shipment_id,
    shippingError: o.shipping_error ?? '',
  };
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function ordersToCsv(rows: AdminOrderRow[]): string {
  const header = ['Reference', 'Date', 'Customer', 'Email', 'Phone', 'Address', 'Units', 'Total', 'Status', 'Payment', 'Tracking'];
  const lines = rows.map((r) =>
    [r.reference, r.date, r.customer, r.email, r.phone, r.address, r.units, r.total, r.status, r.payment, r.tracking]
      .map(csvCell)
      .join(','),
  );
  return [header.join(','), ...lines].join('\n');
}
