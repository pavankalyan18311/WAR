'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, HelpCircle, Lock, MapPin, PackageSearch, Search } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { orderReference } from '@/lib/checkout/client';
import { trackingQuery } from '@/lib/tracking';
import { Meta, OrderTimeline, StatusChip, TrackingInfo, paymentLabel } from '@/components/account/AccountShell';

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initial = searchParams.get('order') ?? searchParams.get('id') ?? '';
  const [query, setQuery] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(initial.length > 0);
  const [order, setOrder] = useState<any | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  const fetchLiveOrder = async (searchStr: string) => {
    const clean = searchStr.trim();
    if (!clean) return;
    setLoading(true);
    setSearched(true);
    try {
      const q = trackingQuery(clean)!;
      const res = await fetch(`/api/orders?${q.param}=${encodeURIComponent(q.value)}`);
      setNeedsLogin(res.status === 401);
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

  const addr = order?.shipping_address;

  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-8 pb-20 space-y-5">
      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); fetchLiveOrder(query); }} className="ui-card p-5 sm:p-7">
        <label htmlFor="order-ref" className="block text-base font-bold mb-3" style={{ color: 'var(--fg)' }}>Order reference</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <PackageSearch size={20} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--fg-subtle)' }} />
            <input
              id="order-ref"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="WAR-1A2B3C4D or AWB no."
              className="ui-input w-full !pl-12 !py-3.5 text-base font-semibold tracking-wide"
              autoComplete="off"
            />
          </div>
          <button type="submit" disabled={loading} className="ui-btn !py-3.5 sm:!px-7">
            <Search size={17} /> {loading ? 'Tracking…' : 'Track'}
          </button>
        </div>
        <p className="text-sm mt-3" style={{ color: 'var(--fg-muted)' }}>
          You&apos;ll find it on your order confirmation, in your email and under My orders.
        </p>
      </form>

      {loading && <div className="h-56 skeleton rounded-2xl" />}

      {needsLogin && !loading && (
        <div className="ui-card py-10 px-6 text-center">
          <span className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>
            <Lock size={24} />
          </span>
          <h2 className="ui-heading text-2xl mb-2" style={{ color: 'var(--fg)' }}>Please sign in to track your order</h2>
          <p className="text-[15px] max-w-md mx-auto mb-6" style={{ color: 'var(--fg-muted)' }}>For your privacy, order details are only shown to the account that placed them.</p>
          <Link href={`/auth/login?redirect=${encodeURIComponent(`/track-order?order=${query}`)}`} className="ui-btn">
            Sign in <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {searched && !loading && !order && !needsLogin && (
        <div className="ui-card py-10 px-6 text-center">
          <span className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>
            <PackageSearch size={24} />
          </span>
          <h2 className="ui-heading text-2xl mb-2" style={{ color: 'var(--fg)' }}>Order not found</h2>
          <p className="text-[15px] max-w-md mx-auto mb-6" style={{ color: 'var(--fg-muted)' }}>
            We couldn&apos;t find an order matching &ldquo;{query}&rdquo;. Please check the reference and try again.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/account/orders" className="ui-btn-ghost">My orders</Link>
            <Link href="/contact" className="ui-btn">Contact support</Link>
          </div>
        </div>
      )}

      {order && !loading && (
        <section className="ui-card overflow-hidden">
          <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-5 flex flex-wrap items-center justify-between gap-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--brand)' }}>
                Placed {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="ui-heading text-2xl sm:text-3xl leading-tight" style={{ color: 'var(--fg)' }}>{orderReference(order.id)}</p>
            </div>
            <StatusChip status={order.status} />
          </div>

          <div className="px-5 sm:px-7 py-7 border-b" style={{ borderColor: 'var(--border)' }}>
            <OrderTimeline status={order.status} placedAt={order.created_at} updatedAt={order.updated_at} />
            {(order.tracking_number || order.courier_name) && (
              <div className="mt-6">
                <TrackingInfo courier={order.courier_name} awb={order.tracking_number} />
              </div>
            )}
          </div>

          {addr && (
            <div className="px-5 sm:px-7 py-6 grid sm:grid-cols-2 gap-6 border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-base font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
                  <MapPin size={17} style={{ color: 'var(--brand)' }} /> Delivering to
                </p>
                <p className="text-[15px] font-semibold" style={{ color: 'var(--fg)' }}>{addr.full_name}</p>
                <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                  {addr.address_line_1}<br />
                  {addr.city}, {addr.state} — {addr.pincode}
                </p>
                {addr.phone && <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>Phone {addr.phone}</p>}
              </div>
              <div className="ui-card-soft p-4 grid grid-cols-2 gap-4 content-start">
                <Meta label="Items">{order.order_items?.length || 0}</Meta>
                <Meta label="Total"><span className="text-base font-extrabold">{formatPrice(order.total)}</span></Meta>
                <div className="col-span-2">
                  <Meta label="Payment">{paymentLabel(order)} <span className="capitalize font-medium" style={{ color: 'var(--fg-muted)' }}>· {order.payment_status}</span></Meta>
                </div>
              </div>
            </div>
          )}

          <div className="px-5 sm:px-7 py-4 flex flex-wrap items-center justify-between gap-3" style={{ background: 'var(--surface-2)' }}>
            <Link href="/account/orders" className="ui-link text-sm inline-flex items-center gap-1.5">View all orders <ArrowRight size={14} /></Link>
            <Link href="/contact" className="text-sm font-semibold inline-flex items-center gap-1.5 hover:text-[var(--brand)]" style={{ color: 'var(--fg-muted)' }}>
              <HelpCircle size={15} /> Need help
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <div className="w-full ui-page min-h-[70vh]">
      <header className="max-w-3xl mx-auto w-full px-4 sm:px-8 pt-10 sm:pt-16 pb-6 sm:pb-8">
        <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--brand)' }}>Order tracking</p>
        <h1 className="ui-heading leading-tight" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: 'var(--fg)' }}>Where&apos;s my order?</h1>
        <p className="text-[15px] mt-2 max-w-md" style={{ color: 'var(--fg-muted)' }}>
          Enter your order reference to see exactly where your parcel is — from packing to your door.
        </p>
      </header>

      <Suspense fallback={<div className="max-w-3xl mx-auto w-full px-4 sm:px-8"><div className="h-36 skeleton rounded-2xl" /></div>}>
        <TrackOrderContent />
      </Suspense>
    </div>
  );
}
