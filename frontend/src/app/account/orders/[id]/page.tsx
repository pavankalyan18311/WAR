'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, AlertCircle, Gift, HelpCircle, MapPin, Truck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/lib/utils';
import { orderReference } from '@/lib/checkout/client';
import ProductImage from '@/components/product/ProductImage';
import { OrderTimeline, PaymentChip, StatusChip, TrackingInfo, paymentLabel } from '@/components/account/AccountShell';

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = typeof (params as any)?.then === 'function' ? use(params as Promise<{ id: string }>) : (params as { id: string });
  const orderId = resolvedParams?.id;

  const { user } = useAuthStore();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancellingItemId, setCancellingItemId] = useState<string | null>(null);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) return;
      try {
        const response = await fetch(`/api/orders?order_id=${encodeURIComponent(orderId)}`);
        if (response.ok) {
          const resData = await response.json();
          const found = resData.orders?.[0];
          // Only the owner gets the full order (with items); anything else is "not found" here.
          if (found?.order_items) setOrder(found);
        }
      } catch (err) {
        console.error('Error fetching order details', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId, user?.id]);

  const handleCancelItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to cancel this item?')) return;

    setCancellingItemId(itemId);
    setCancelNotice(null);
    setCancelError(null);

    try {
      const response = await fetch('/api/payments/razorpay/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          item_id: itemId,
          reason: 'Customer cancelled individual item via order dashboard',
        }),
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        setCancelNotice(resData.message || 'Item cancelled and refund processed.');

        // Update local order state
        setOrder((prev: any) => {
          if (!prev) return prev;
          const updatedItems = (prev.order_items || []).map((it: any) =>
            it.id === itemId ? { ...it, status: 'cancelled' } : it
          );
          return {
            ...prev,
            status: resData.new_status,
            total: resData.new_total,
            payment_status: resData.new_status === 'cancelled' && resData.refund_amount > 0 ? 'refunded' : prev.payment_status,
            order_items: updatedItems,
          };
        });
      } else {
        throw new Error(resData.error || 'Failed to cancel item.');
      }
    } catch (err: any) {
      console.error('Cancel item error:', err);
      setCancelError(err.message || 'Failed to cancel item');
    } finally {
      setCancellingItemId(null);
    }
  };


  if (loading) {
    return (
      <div className="w-full ui-page">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-8 py-10 space-y-4">
          <div className="h-4 w-32 skeleton" />
          <div className="h-10 w-64 skeleton" />
          <div className="h-36 skeleton rounded-2xl" />
          <div className="h-64 skeleton rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="w-full ui-page">
        <div className="max-w-xl mx-auto w-full px-4 sm:px-8 py-16">
          <div className="ui-card py-12 px-6 text-center">
            <span className="mx-auto mb-5 w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}>
              <AlertCircle size={26} />
            </span>
            <h1 className="ui-heading text-3xl mb-2" style={{ color: 'var(--fg)' }}>Order not found</h1>
            <p className="text-[15px] max-w-sm mx-auto mb-7" style={{ color: 'var(--fg-muted)' }}>
              This order doesn&apos;t exist, or it belongs to another account.
            </p>
            <Link href="/account/orders" className="ui-btn">Back to my orders</Link>
          </div>
        </div>
      </div>
    );
  }

  const isCancellable = ['confirmed', 'processing', 'pending'].includes(order?.status);
  const addr = order.shipping_address ?? order.delivery_address ?? {};
  const placed = new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const trackable = !['pending', 'cancelled', 'refunded'].includes(order.status);
  const pointsUsed = Number(order.points_used) || 0;
  const pointsEarned = Number(order.points_earned) || 0;
  const discount = Number(order.discount) || 0;
  const shipping = Number(order.shipping) || 0;

  return (
    <div className="w-full ui-page min-h-[70vh]">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-8 py-8 sm:py-12">
        <Link href="/account/orders" className="inline-flex items-center gap-2 text-sm font-semibold mb-6 hover:text-[var(--brand)]"
          style={{ color: 'var(--fg-muted)' }}>
          <ArrowLeft size={16} /> Back to my orders
        </Link>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--brand)' }}>Placed {placed}</p>
            <h1 className="ui-heading leading-tight" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--fg)' }}>{orderReference(order.id)}</h1>
          </div>
          <StatusChip status={order.status} />
        </div>

        {cancelNotice && (
          <p role="status" className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}>
            <CheckCircle2 size={16} /> {cancelNotice}
          </p>
        )}
        {cancelError && (
          <p role="alert" className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'var(--bad-soft)', color: 'var(--bad)' }}>
            <AlertCircle size={16} /> {cancelError}
          </p>
        )}

        {/* Progress */}
        <section className="ui-card p-5 sm:p-7 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="ui-heading text-xl" style={{ color: 'var(--fg)' }}>Order status</h2>
            {trackable && (
              <Link href={`/track-order?order=${order.id}`} className="ui-link text-sm inline-flex items-center gap-1.5">
                <Truck size={15} /> Track order
              </Link>
            )}
          </div>
          <OrderTimeline status={order.status} placedAt={order.created_at} updatedAt={order.updated_at} />
          {(order.tracking_number || order.courier_name) && (
            <div className="mt-6">
              <TrackingInfo courier={order.courier_name} awb={order.tracking_number} />
            </div>
          )}
        </section>

        <div className="grid lg:grid-cols-12 gap-5">
          {/* Items */}
          <section className="lg:col-span-7 ui-card p-5 sm:p-7 self-start">
            <h2 className="ui-heading text-xl mb-4" style={{ color: 'var(--fg)' }}>
              Items <span className="text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>({order?.order_items?.length || 0})</span>
            </h2>
            <ul className="space-y-4">
              {order?.order_items?.map((item: any) => {
                const itemPrice = item.total_price || item.unit_price * item.quantity;
                const isCancelled = item.status === 'cancelled';
                const meta = [item.variant?.size && `Size ${item.variant.size}`, item.variant?.color, `Qty ${item.quantity}`].filter(Boolean).join(' · ');
                const name = item.product?.name || 'WAR Apparel';
                return (
                  <li key={item.id} className="flex gap-3 sm:gap-4 pb-4 border-b last:border-b-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
                    <div className="relative w-16 h-20 sm:w-20 sm:h-24 flex-shrink-0 overflow-hidden rounded-xl"
                      style={{ background: 'var(--surface-2)', opacity: isCancelled ? 0.5 : 1 }}>
                      <ProductImage src={item.product?.images?.[0]?.url} alt={name} sizes="80px" />
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        {item.product?.slug && !isCancelled ? (
                          <Link href={`/products/${item.product.slug}`} className="text-[15px] font-semibold leading-snug hover:text-[var(--brand)]" style={{ color: 'var(--fg)' }}>
                            {name}
                          </Link>
                        ) : (
                          <p className="text-[15px] font-semibold leading-snug"
                            style={{ color: isCancelled ? 'var(--fg-subtle)' : 'var(--fg)', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                            {name}
                          </p>
                        )}
                        <span className="text-[15px] font-bold whitespace-nowrap" style={{ color: isCancelled ? 'var(--fg-subtle)' : 'var(--fg)' }}>{formatPrice(itemPrice)}</span>
                      </div>
                      <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>{meta}</p>
                      <div className="mt-auto pt-2 flex items-center gap-3">
                        {isCancelled && <span className="ui-chip ui-chip-bad">Cancelled</span>}
                        {!isCancelled && isCancellable && (
                          <button
                            onClick={() => handleCancelItem(item.id)}
                            disabled={cancellingItemId === item.id}
                            className="text-sm font-semibold rounded-full border px-3.5 py-1.5 transition-colors hover:border-[var(--bad)] hover:text-[var(--bad)] disabled:opacity-50"
                            style={{ borderColor: 'var(--border-strong)', color: 'var(--fg-muted)' }}
                          >
                            {cancellingItemId === item.id ? 'Cancelling…' : 'Cancel Item'}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {isCancellable && (
              <p className="text-sm mt-5 rounded-xl px-4 py-3" style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>
                Items can be cancelled until the order ships. Online payments are refunded automatically.
              </p>
            )}
          </section>

          {/* Summary */}
          <aside className="lg:col-span-5 space-y-5">
            <div className="ui-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="ui-heading text-lg" style={{ color: 'var(--fg)' }}>Payment</h2>
                <PaymentChip order={order} />
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>{paymentLabel(order)}</p>
              <dl className="space-y-2.5 text-[15px]">
                {order.subtotal != null && (
                  <Row label="Items total" value={formatPrice(order.subtotal)} />
                )}
                {discount > 0 && (
                  <Row label={order.coupon_code ? `Coupon ${order.coupon_code}` : 'Discount'} value={`− ${formatPrice(discount)}`} tone="ok" />
                )}
                {pointsUsed > 0 && (
                  <Row label="Reward points used" value={`− ${formatPrice(pointsUsed)}`} tone="ok" />
                )}
                <Row label="Shipping" value={shipping > 0 ? formatPrice(shipping) : 'Free'} tone={shipping > 0 ? undefined : 'ok'} />
              </dl>
              <div className="mt-4 pt-4 border-t flex items-baseline justify-between" style={{ borderColor: 'var(--border)' }}>
                <span className="text-base font-bold" style={{ color: 'var(--fg)' }}>Total</span>
                <span className="text-2xl font-extrabold" style={{ color: 'var(--fg)' }}>{formatPrice(order?.total)}</span>
              </div>
              {pointsEarned > 0 && (
                <p className="mt-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
                  <Gift size={16} /> You earned {pointsEarned} reward points on this order
                </p>
              )}
            </div>

            <div className="ui-card p-5 sm:p-6">
              <h2 className="ui-heading text-lg mb-3 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                <MapPin size={18} style={{ color: 'var(--brand)' }} /> Delivering to
              </h2>
              <p className="text-[15px] font-semibold" style={{ color: 'var(--fg)' }}>{addr.full_name}</p>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                {[addr.address_line_1 || addr.address_line1, addr.address_line_2].filter(Boolean).join(', ')}
                <br />
                {[addr.city, addr.state].filter(Boolean).join(', ')}{addr.pincode ? ` — ${addr.pincode}` : ''}
              </p>
              {addr.phone && <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>Phone {addr.phone}</p>}
            </div>

            <Link href="/contact" className="ui-btn-ghost w-full"><HelpCircle size={16} /> Need help with this order?</Link>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'ok' }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt style={{ color: 'var(--fg-muted)' }}>{label}</dt>
      <dd className="font-semibold" style={{ color: tone === 'ok' ? 'var(--ok)' : 'var(--fg)' }}>{value}</dd>
    </div>
  );
}
