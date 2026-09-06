'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Package, ArrowLeft, CheckCircle2, Clock, RefreshCw, Truck, AlertCircle, MapPin, CreditCard, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils';

const STATUS_TIMELINE = [
  { key: 'confirmed', label: 'Ordered & Confirmed', desc: 'Your order has been placed' },
  { key: 'processing', label: 'Packed & Processing', desc: 'Quality checked & prepared' },
  { key: 'shipped', label: 'Out for Delivery', desc: 'Handed to logistics partner' },
  { key: 'delivered', label: 'Delivered', desc: 'Package delivered safely' },
];

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
        const response = await fetch(`/api/orders?order_id=${orderId}`);
        if (response.ok) {
          const resData = await response.json();
          if (resData.orders && resData.orders.length > 0) {
            setOrder(resData.orders[0]);
            setLoading(false);
            return;
          }
        }

        // Fallback direct query on Supabase if API route returns empty
        const supabase = createClient();
        const { data } = await supabase
          .from('orders')
          .select('*')
          .or(`id.eq.${orderId},order_number.eq.${orderId}`)
          .maybeSingle();

        if (data) {
          setOrder(data);
        }
      } catch (err) {
        console.error('Error fetching order details', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId, user?.id]);

  const handleCancelItem = async (itemId: string, itemPrice: number) => {
    if (!confirm(`Are you sure you want to cancel this item? ₹${itemPrice} will be refunded.`)) return;

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
          const activeCount = updatedItems.filter((it: any) => it.status !== 'cancelled').length;
          const newStatus = activeCount === 0 ? 'cancelled' : 'partially_cancelled';
          const newTotal = Math.max(0, prev.total - itemPrice);

          return {
            ...prev,
            status: newStatus,
            total: newTotal,
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
      <main className="min-h-screen py-16 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen py-16 text-center" style={{ background: 'var(--bg)' }}>
        <div className="max-w-md mx-auto px-5">
          <Package size={40} className="mx-auto mb-3" style={{ color: 'var(--fg-subtle)' }} />
          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--fg)' }}>Order Not Found</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--fg-muted)' }}>This order does not exist or has been removed from the database.</p>
          <Link href="/account/orders" className="px-6 py-2.5 rounded-xl text-xs font-bold" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
            Back to My Orders
          </Link>
        </div>
      </main>
    );
  }

  const statusIndex = STATUS_TIMELINE.findIndex((s) => s.key === order?.status);
  const currentStep = statusIndex === -1 ? 0 : statusIndex;
  const isCancellable = ['confirmed', 'processing', 'pending'].includes(order?.status);

  return (
    <main className="min-h-screen py-10" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <Link href="/account/orders" className="inline-flex items-center gap-2 text-sm font-semibold mb-6 hover:opacity-70" style={{ color: 'var(--fg-muted)' }}>
          <ArrowLeft size={16} /> Back to My Orders
        </Link>

        {cancelNotice && (
          <div className="mb-6 p-4 rounded-xl flex items-center gap-3"
            style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1.5px solid #22c55e', color: '#22c55e' }}>
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <p className="text-xs font-bold">{cancelNotice}</p>
          </div>
        )}

        {cancelError && (
          <div className="mb-6 p-4 rounded-xl flex items-center gap-3"
            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1.5px solid #ef4444', color: '#ef4444' }}>
            <AlertCircle size={18} className="flex-shrink-0" />
            <p className="text-xs font-bold">{cancelError}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--fg-subtle)' }}>Order Details</p>
            <h1 className="text-3xl font-black mt-1" style={{ color: 'var(--fg)' }}>
              #{order?.order_number || (order?.id ? order.id.slice(0, 8) : 'WAR-ORDER')}
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
              Placed on {order?.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
            </p>
          </div>
          <span className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider"
            style={{
              background: order?.status === 'cancelled' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              color: order?.status === 'cancelled' ? '#ef4444' : '#22c55e',
              border: `1px solid ${order?.status === 'cancelled' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
            }}>
            Status: {order?.status}
          </span>
        </div>

        {/* Shiprocket AWB Tracking Code Banner */}
        {order?.tracking_number && (
          <div className="mb-6 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--fg-subtle)]">Shiprocket AWB Tracking Code</p>
              <p className="text-sm font-mono font-bold text-[var(--accent)] mt-0.5">{order.tracking_number}</p>
            </div>
            <Link href={`/track-order?order=${order.id}`}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:opacity-90 cursor-pointer"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
              Track Live Courier
            </Link>
          </div>
        )}

        {/* Timeline */}
        <div className="rounded-2xl p-6 mb-8" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="text-xs font-black uppercase tracking-[0.2em] mb-6" style={{ color: 'var(--fg)' }}>Tracking Progress</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {STATUS_TIMELINE.map((step, idx) => {
              const isPassed = idx <= currentStep;
              return (
                <div key={step.key} className="flex flex-col items-start relative">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-2"
                    style={{
                      background: isPassed ? '#22c55e' : 'var(--bg-elevated)',
                      color: isPassed ? '#fff' : 'var(--fg-muted)',
                      border: isPassed ? 'none' : '1px solid var(--border)',
                    }}>
                    {isPassed ? <CheckCircle2 size={16} /> : idx + 1}
                  </div>
                  <p className="text-xs font-bold" style={{ color: isPassed ? 'var(--fg)' : 'var(--fg-muted)' }}>{step.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--fg-subtle)' }}>{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--fg)' }}>Ordered Items</h2>
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {order?.order_items?.map((item: any) => {
                  const itemPrice = item.total_price || item.unit_price * item.quantity;
                  const isCancelled = item.status === 'cancelled';
                  return (
                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-12 h-14 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background: 'var(--bg-elevated)' }}>
                          <Package size={20} style={{ color: 'var(--fg-subtle)' }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: isCancelled ? 'var(--fg-muted)' : 'var(--fg)', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                            {item.product?.name || 'WAR Apparel'}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                            Qty: {item.quantity} {item.variant?.size ? `· Size: ${item.variant.size}` : ''} {item.variant?.color ? `· Color: ${item.variant.color}` : ''}
                          </p>
                          {isCancelled && (
                            <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded"
                              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                              Cancelled & Refunded
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black" style={{ color: 'var(--fg)' }}>{formatPrice(itemPrice)}</span>
                        {!isCancelled && isCancellable && (
                          <button
                            onClick={() => handleCancelItem(item.id, itemPrice)}
                            disabled={cancellingItemId === item.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                            style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                          >
                            {cancellingItemId === item.id ? 'Cancelling…' : 'Cancel Item'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Delivery & Payment Summary */}
          <div className="space-y-6">
            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={16} style={{ color: 'var(--fg-muted)' }} />
                <h3 className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: 'var(--fg)' }}>Delivery Address</h3>
              </div>
              <p className="text-xs font-bold" style={{ color: 'var(--fg)' }}>
                {order?.shipping_address?.full_name || order?.delivery_address?.full_name || 'Customer'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                {order?.shipping_address?.address_line_1 || order?.delivery_address?.address_line1}, {order?.shipping_address?.city || order?.delivery_address?.city}, {order?.shipping_address?.state || order?.delivery_address?.state} - {order?.shipping_address?.pincode || order?.delivery_address?.pincode}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--fg-subtle)' }}>
                Phone: {order?.shipping_address?.phone || order?.delivery_address?.phone}
              </p>
            </div>

            <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard size={16} style={{ color: 'var(--fg-muted)' }} />
                <h3 className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: 'var(--fg)' }}>Payment Summary</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                  <span>Method</span>
                  <span className="font-bold uppercase" style={{ color: 'var(--fg)' }}>
                    {(() => {
                      let notesObj: any = {};
                      if (typeof order?.notes === 'string') {
                        try { notesObj = JSON.parse(order.notes); } catch (e) {}
                      } else if (typeof order?.notes === 'object' && order?.notes !== null) {
                        notesObj = order.notes;
                      }
                      const gateway = notesObj.gateway || order?.shipping_address?.gateway;
                      const detail = notesObj.payment_method_detail || order?.shipping_address?.payment_method_detail || order?.payment_method || 'ONLINE';
                      const wallet = notesObj.wallet || order?.shipping_address?.wallet;
                      if (gateway === 'Razorpay') {
                        return `RAZORPAY (${detail.toUpperCase()}${wallet ? ` - ${wallet.toUpperCase()}` : ''})`;
                      }
                      return (order?.payment_method || 'COD').toUpperCase();
                    })()}
                  </span>
                </div>
                <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                  <span>Status</span>
                  <span className="font-bold capitalize" style={{ color: '#22c55e' }}>{order?.payment_status || 'paid'}</span>
                </div>
                <div className="pt-2 flex justify-between font-black text-sm" style={{ borderTop: '1px solid var(--border)', color: 'var(--fg)' }}>
                  <span>Total Amount</span>
                  <span>{formatPrice(order?.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

