'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Package, ChevronDown, ChevronUp, MapPin, CreditCard, RotateCcw, FileDown } from 'lucide-react';
import { MOCK_ORDERS } from '@/lib/mockData';
import { formatPrice } from '@/lib/utils';
import type { Order, OrderStatus } from '@/types';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { OrderCardSkeleton } from '@/components/ui/Skeleton';

const STATUS_STEPS: { key: OrderStatus | 'processing' | 'out_for_delivery'; label: string; description: string }[] = [
  { key: 'pending', label: 'Order Placed', description: 'We received your order' },
  { key: 'confirmed', label: 'Order Confirmed', description: 'Payment verified' },
  { key: 'processing', label: 'Packed', description: 'Ready to ship' },
  { key: 'shipped', label: 'Shipped', description: 'On the way' },
  { key: 'out_for_delivery', label: 'Out For Delivery', description: 'Arriving soon' },
  { key: 'delivered', label: 'Delivered', description: 'Package delivered' },
];

const STATUS_ORDER: (OrderStatus | 'processing' | 'out_for_delivery')[] = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'rgba(234,179,8,0.12)', text: '#ca8a04', label: 'Pending' },
  confirmed: { bg: 'rgba(59,130,246,0.12)', text: '#2563eb', label: 'Confirmed' },
  processing: { bg: 'rgba(168,85,247,0.12)', text: '#9333ea', label: 'Packed' },
  shipped: { bg: 'rgba(6,182,212,0.12)', text: '#0891b2', label: 'Shipped' },
  delivered: { bg: 'rgba(34,197,94,0.12)', text: '#16a34a', label: 'Delivered' },
  cancelled: { bg: 'rgba(239,68,68,0.12)', text: '#dc2626', label: 'Cancelled' },
  refunded: { bg: 'rgba(107,114,128,0.12)', text: '#6b7280', label: 'Refunded' },
};

function TrackingTimeline({ status }: { status: OrderStatus }) {
  const currentKey: OrderStatus | 'processing' | 'out_for_delivery' =
    status === 'delivered' ? 'delivered' :
      status === 'shipped' ? 'out_for_delivery' :
        status;
  const currentIdx = STATUS_ORDER.indexOf(currentKey);
  const isTerminal = status === 'cancelled' || status === 'refunded';

  if (isTerminal) {
    return (
      <div className="flex items-center gap-2 mt-4 p-3 rounded-xl text-sm font-semibold"
        style={{ background: STATUS_COLORS[status]?.bg, color: STATUS_COLORS[status]?.text }}>
        <RotateCcw size={14} />
        Order {STATUS_COLORS[status]?.label}
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
      <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: 'var(--fg-muted)' }}>Order Progress</p>
      <div className="flex items-start gap-0">
        {STATUS_STEPS.map((step, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx;
          const isLast = i === STATUS_STEPS.length - 1;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative">
              {/* Connector line */}
              {!isLast && (
                <div className="absolute top-3.5 left-1/2 w-full h-0.5"
                  style={{ background: done && i < currentIdx ? 'var(--primary)' : 'var(--bg-elevated)' }} />
              )}
              {/* Dot */}
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all"
                style={{
                  background: done ? 'var(--primary)' : 'var(--bg-elevated)',
                  border: `2px solid ${active ? 'var(--primary)' : done ? 'var(--primary)' : 'var(--border)'}`,
                  boxShadow: active ? '0 0 0 4px rgba(var(--primary-rgb,99,102,241),0.15)' : undefined,
                }}>
                {done && (
                  <svg viewBox="0 0 10 8" width="10" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="var(--primary-fg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              {/* Label */}
              <p className="text-[9px] font-bold mt-1.5 text-center leading-tight px-0.5"
                style={{ color: done ? 'var(--fg)' : 'var(--fg-subtle)' }}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const statusMeta = STATUS_COLORS[order.status] ?? STATUS_COLORS.pending;
  const date = new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const downloadInvoice = () => {
    const rows = order.items
      .map((item, idx) => `${idx + 1}. ${item.product.name} | Size: ${item.variant.size} | Qty: ${item.quantity} | ${formatPrice(item.unit_price * item.quantity)}`)
      .join('\n');

    const invoiceText = [
      'THREADX - TAX INVOICE (MOCK)',
      `Order Number: ${order.order_number}`,
      `Order Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}`,
      `Status: ${statusMeta.label}`,
      '',
      'Items:',
      rows,
      '',
      `Subtotal: ${formatPrice(order.subtotal)}`,
      `Discount: -${formatPrice(order.discount)}`,
      `Shipping: ${order.shipping === 0 ? 'FREE' : formatPrice(order.shipping)}`,
      `Total: ${formatPrice(order.total)}`,
      '',
      `Bill To: ${order.shipping_address.full_name}`,
      `${order.shipping_address.address_line_1}`,
      `${order.shipping_address.city}, ${order.shipping_address.state} - ${order.shipping_address.pincode}`,
      '',
      'This is a system-generated mock invoice for demo purposes.',
    ].join('\n');

    const blob = new Blob([invoiceText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${order.order_number}-invoice.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--bg-elevated)' }}>
              <Package size={18} style={{ color: 'var(--fg-muted)' }} />
            </div>
            <div>
              <p className="font-black text-sm" style={{ color: 'var(--fg)' }}>{order.order_number}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{date} · {order.items.length} item{order.items.length > 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:flex-shrink-0">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: statusMeta.bg, color: statusMeta.text }}>
              {statusMeta.label}
            </span>
            <span className="font-black text-sm" style={{ color: 'var(--fg)' }}>{formatPrice(order.total)}</span>
            {expanded ? <ChevronUp size={16} style={{ color: 'var(--fg-subtle)' }} /> : <ChevronDown size={16} style={{ color: 'var(--fg-subtle)' }} />}
          </div>
        </div>
      </button>

      {/* Product thumbnails preview strip */}
      <div className="flex gap-2 px-4 sm:px-5 pb-4" onClick={() => setExpanded((v) => !v)} style={{ cursor: 'pointer' }}>
        {order.items.map((item, i) => (
          <div key={i} className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 relative"
            style={{ border: '1px solid var(--border)' }}>
            <Image
              src={item.product.images?.[0]?.url ?? '/placeholder.png'}
              alt={item.product.name}
              fill className="object-cover"
            />
          </div>
        ))}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t px-4 sm:px-5 py-5 space-y-5" style={{ borderColor: 'var(--border)' }}>
          {/* Items */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>Items Ordered</p>
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative"
                    style={{ border: '1px solid var(--border)' }}>
                    <Image src={item.product.images?.[0]?.url ?? '/placeholder.png'} alt={item.product.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${item.product.slug}`}
                      className="text-sm font-semibold hover:underline line-clamp-1" style={{ color: 'var(--fg)' }}>
                      {item.product.name}
                    </Link>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                      Size: {item.variant.size} · Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="font-bold text-sm flex-shrink-0" style={{ color: 'var(--fg)' }}>
                    {formatPrice(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tracking */}
          <TrackingTimeline status={order.status} />

          {/* Order summary + address row */}
          <div className="grid sm:grid-cols-2 gap-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            {/* Summary */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>Payment Summary</p>
              <div className="space-y-1.5 text-sm">
                {[
                  { label: 'Subtotal', value: formatPrice(order.subtotal) },
                  ...(order.discount > 0 ? [{ label: `Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}`, value: `-${formatPrice(order.discount)}` }] : []),
                  { label: 'Shipping', value: order.shipping === 0 ? 'FREE' : formatPrice(order.shipping) },
                  { label: 'Total', value: formatPrice(order.total), bold: true },
                ].map(({ label, value, bold }) => (
                  <div key={label} className="flex justify-between">
                    <span style={{ color: 'var(--fg-muted)', fontWeight: bold ? 700 : 400 }}>{label}</span>
                    <span style={{ color: bold ? 'var(--fg)' : 'var(--fg-muted)', fontWeight: bold ? 800 : 400 }}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: 'var(--fg-muted)' }}>
                <CreditCard size={12} />
                {order.payment_method === 'upi' ? 'Paid via UPI' :
                  order.payment_method === 'card' ? 'Paid via Card' :
                    order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}
              </div>
              <button
                type="button"
                onClick={downloadInvoice}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold hover:opacity-70"
                style={{ color: 'var(--accent)' }}
              >
                <FileDown size={12} /> Download Invoice
              </button>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/track-order?order=${encodeURIComponent(order.order_number)}`}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
                  style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
                >
                  Track Order
                </Link>
                <Link
                  href={`/track-order?order=${encodeURIComponent(order.order_number)}`}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--fg)' }}
                >
                  View Details
                </Link>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--fg)' }}
                >
                  Return / Exchange
                </button>
              </div>
            </div>

            {/* Address */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--fg-muted)' }}>Delivery Address</p>
              <div className="flex gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <MapPin size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--fg-subtle)' }} />
                <div>
                  <p className="font-semibold" style={{ color: 'var(--fg)' }}>{order.shipping_address.full_name}</p>
                  <p>{order.shipping_address.address_line_1}</p>
                  <p>{order.shipping_address.city}, {order.shipping_address.state} – {order.shipping_address.pincode}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyOrdersPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const orders = MOCK_ORDERS;

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
          <p className="text-xs font-bold tracking-[0.3em] uppercase mb-1" style={{ color: 'var(--accent)' }}>Account</p>
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--fg)' }}>My Orders</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 space-y-4">
        {!mounted ? (
          Array.from({ length: 3 }).map((_, i) => <OrderCardSkeleton key={i} />)
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package size={40} className="mx-auto mb-4" style={{ color: 'var(--fg-subtle)' }} />
            <p className="font-bold text-lg mb-2" style={{ color: 'var(--fg)' }}>No orders yet</p>
            <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>When you place an order, it will appear here.</p>
            <Link href="/products"
              className="inline-block px-6 py-2.5 rounded-full font-bold text-sm"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
              Shop Now
            </Link>
          </div>
        ) : (
          orders.map((order, i) => (
            <ScrollReveal key={order.order_id} animation="fade-up" delay={i * 80}>
              <OrderCard order={order} />
            </ScrollReveal>
          ))
        )}
      </div>
    </main>
  );
}
