'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, PackageSearch, CheckCircle2, Truck, Box, ShoppingBag, ArrowRight, RefreshCw, ExternalLink } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { OrderStatus } from '@/types';

const STATUS_STEPS: { key: string; label: string; icon: React.ElementType }[] = [
  { key: 'pending', label: 'Ordered', icon: ShoppingBag },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'processing', label: 'Packed', icon: Box },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
];

const STATUS_ORDER = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

function TrackingTimeline({ status }: { status: string }) {
  const isTerminal = status === 'cancelled' || status === 'refunded';
  const currentIdx = Math.max(0, STATUS_ORDER.indexOf(status));

  if (isTerminal) {
    return (
      <div className="mt-5 rounded-xl p-3 text-sm font-semibold"
        style={{
          background: status === 'cancelled' ? 'rgba(239,68,68,0.12)' : 'rgba(107,114,128,0.12)',
          color: status === 'cancelled' ? '#dc2626' : '#6b7280',
        }}>
        Order {status === 'cancelled' ? 'Cancelled' : 'Refunded'}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: 'var(--fg-muted)' }}>
        Shiprocket Tracking Timeline
      </p>
      <div className="flex items-start gap-0">
        {STATUS_STEPS.map((step, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx;
          const isLast = i === STATUS_STEPS.length - 1;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative">
              {!isLast && (
                <div className="absolute top-4 left-1/2 w-full h-0.5"
                  style={{ background: done && i < currentIdx ? 'var(--primary)' : 'var(--bg-elevated)' }} />
              )}
              <div className="w-8 h-8 rounded-full flex items-center justify-center z-10"
                style={{
                  background: done ? 'var(--primary)' : 'var(--bg-elevated)',
                  border: `2px solid ${active ? 'var(--primary)' : done ? 'var(--primary)' : 'var(--border)'}`,
                }}>
                <Icon size={13} style={{ color: done ? 'var(--primary-fg)' : 'var(--fg-subtle)' }} />
              </div>
              <p className="text-[10px] font-semibold mt-1.5 text-center" style={{ color: done ? 'var(--fg)' : 'var(--fg-subtle)' }}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initial = searchParams.get('order') ?? searchParams.get('id') ?? '';
  const [query, setQuery] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(initial.length > 0);
  const [order, setOrder] = useState<any | null>(null);

  const fetchLiveOrder = async (searchStr: string) => {
    const clean = searchStr.trim();
    if (!clean) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/orders?order_id=${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.orders && data.orders.length > 0) {
          setOrder(data.orders[0]);
        } else {
          setOrder(null);
        }
      } else {
        setOrder(null);
      }
    } catch (err) {
      console.error('Error tracking order:', err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initial) {
      fetchLiveOrder(initial);
    }
  }, [initial]);

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 space-y-5">
      <section className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--fg-muted)' }}>
          Order ID or Tracking Number
        </label>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter Order ID (e.g. ord-1741234 or WAR-12345)"
            className="flex-1 px-3.5 py-3 rounded-xl text-sm outline-none"
            style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', color: 'var(--fg)' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                fetchLiveOrder(query);
              }
            }}
          />
          <button
            onClick={() => fetchLiveOrder(query)}
            disabled={loading}
            className="px-5 py-3 rounded-xl text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
            {loading ? 'Tracking…' : 'Track'}
          </button>
        </div>
        <p className="text-[11px] mt-2" style={{ color: 'var(--fg-subtle)' }}>
          Tip: You can find your Order ID or tracking code in your order confirmation screen and My Orders page.
        </p>
      </section>

      {searched && !loading && !order && (
        <section className="rounded-2xl p-8 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <PackageSearch size={32} className="mx-auto mb-3" style={{ color: 'var(--fg-subtle)' }} />
          <p className="text-lg font-bold" style={{ color: 'var(--fg)' }}>Order not found</p>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            We couldn't find an order matching "{query}". Please check the ID and try again.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 justify-center">
            <Link href="/account/orders" className="px-4 py-2 rounded-lg text-xs font-bold"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
              My Orders
            </Link>
            <Link href="/support" className="px-4 py-2 rounded-lg text-xs font-bold"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
              Contact Support
            </Link>
          </div>
        </section>
      )}

      {order && (
        <section className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-widest uppercase font-mono" style={{ color: 'var(--fg)' }}>
                Order #{order.id?.slice(0, 8)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full w-fit uppercase tracking-wider"
              style={{
                background:
                  order.status === 'delivered' ? 'rgba(34,197,94,0.12)' :
                    order.status === 'shipped' ? 'rgba(6,182,212,0.12)' :
                      order.status === 'confirmed' ? 'rgba(59,130,246,0.12)' :
                        order.status === 'cancelled' ? 'rgba(239,68,68,0.12)' : 'rgba(234,179,8,0.12)',
                color:
                  order.status === 'delivered' ? '#16a34a' :
                    order.status === 'shipped' ? '#0891b2' :
                      order.status === 'confirmed' ? '#2563eb' :
                        order.status === 'cancelled' ? '#dc2626' : '#ca8a04',
              }}>
              {order.status.replace('_', ' ')}
            </span>
          </div>

          {/* Tracking Number / Shiprocket AWB Banner */}
          {order.tracking_number && (
            <div className="mt-4 p-3.5 rounded-xl flex items-center justify-between text-xs font-semibold"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div>
                <span style={{ color: 'var(--fg-muted)' }}>Shiprocket AWB / Tracking Code: </span>
                <span className="font-mono font-bold" style={{ color: 'var(--accent)' }}>{order.tracking_number}</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded font-bold uppercase" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
                Shiprocket Verified
              </span>
            </div>
          )}

          <TrackingTimeline status={order.status} />

          <div className="mt-6 grid sm:grid-cols-2 gap-4 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase mb-2" style={{ color: 'var(--fg-muted)' }}>
                Delivery Address
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{order.shipping_address?.full_name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{order.shipping_address?.address_line_1}</p>
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                {order.shipping_address?.city}, {order.shipping_address?.state} - {order.shipping_address?.pincode}
              </p>
              <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--fg-subtle)' }}>Phone: {order.shipping_address?.phone}</p>
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase mb-2" style={{ color: 'var(--fg-muted)' }}>
                Order Details
              </p>
              <div className="text-xs space-y-1.5">
                <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                  <span>Items</span>
                  <span className="font-semibold" style={{ color: 'var(--fg)' }}>{order.order_items?.length || 0}</span>
                </div>
                <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                  <span>Total Amount</span>
                  <span className="font-bold" style={{ color: 'var(--fg)' }}>{formatPrice(order.total)}</span>
                </div>
                <div className="flex justify-between" style={{ color: 'var(--fg-muted)' }}>
                  <span>Payment Method</span>
                  <span className="uppercase font-semibold">{order.payment_method} ({order.payment_status})</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/account/orders" className="px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
              View All Orders
            </Link>
            <Link href="/support" className="px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
              Need Help <ArrowRight size={12} />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12">
          <p className="text-xs font-bold tracking-[0.3em] uppercase mb-2" style={{ color: 'var(--accent)' }}>Order Tracking</p>
          <h1 className="text-3xl sm:text-4xl font-black" style={{ color: 'var(--fg)' }}>Track Your Order</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>
            Enter your order reference ID to view real-time Shiprocket courier tracking status.
          </p>
        </div>
      </div>

      <Suspense fallback={
        <div className="max-w-3xl mx-auto px-5 py-16 text-center">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2" style={{ color: 'var(--accent)' }} />
          <p className="text-xs font-bold" style={{ color: 'var(--fg-muted)' }}>Loading tracking system…</p>
        </div>
      }>
        <TrackOrderContent />
      </Suspense>
    </main>
  );
}
