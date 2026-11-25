'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ShoppingBag, Truck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getUserDisplayInfo } from '@/lib/userDisplay';
import { formatPrice } from '@/lib/utils';
import { orderReference } from '@/lib/checkout/client';
import ProductImage from '@/components/product/ProductImage';
import { AccountShell, Meta, StatusChip, paymentLabel } from '@/components/account/AccountShell';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status?: string;
  product?: {
    name: string;
    slug: string;
    images?: { url: string }[];
  };
  variant?: {
    size: string;
    color: string;
  };
}

interface Order {
  id: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  total: number;
  subtotal: number;
  discount: number;
  shipping: number;
  payment_method: string;
  payment_status: string;
  tracking_number?: string;
  notes?: string | Record<string, any> | null;
  shipping_address?: Record<string, any> | null;
  created_at: string;
  order_items?: OrderItem[];
}

export default function UserOrdersPage() {
  const { user, logout } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      let apiOrders: Order[] = [];

      if (user?.id) {
        try {
          const response = await fetch(`/api/orders`);
          if (response.ok) {
            const resData = await response.json();
            if (resData.orders && Array.isArray(resData.orders)) {
              apiOrders = resData.orders;
            }
          }
        } catch (err) {
          console.error('Failed to load orders from database API', err);
        }
      }

      // Sort database orders by created_at descending
      apiOrders.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      setOrders(apiOrders);
      setLoading(false);
    }

    fetchOrders();
  }, [user?.id]);

  const firstName = user ? getUserDisplayInfo(user).name.split(' ')[0] : '';

  return (
    <AccountShell
      active="orders"
      eyebrow={firstName ? `Hello, ${firstName}` : 'Your account'}
      title="My orders"
      subtitle="Track, manage and look back at everything you've ordered."
      onLogout={async () => { await logout(); }}
    >
      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => <div key={i} className="h-40 skeleton rounded-2xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="ui-card py-14 px-6 text-center">
          <span className="mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
            <ShoppingBag size={28} />
          </span>
          <h2 className="ui-heading text-2xl sm:text-3xl mb-2" style={{ color: 'var(--fg)' }}>No orders yet.</h2>
          <p className="text-[15px] max-w-sm mx-auto mb-7" style={{ color: 'var(--fg-muted)' }}>
            When you place an order it will appear here, with live tracking from packing to your door.
          </p>
          <Link href="/products" className="ui-btn">Explore the shop <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => {
            const formattedDate = new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            const items = order.order_items ?? [];
            const count = items.reduce((n, i) => n + (i.quantity || 0), 0);
            const trackable = !['pending', 'cancelled', 'refunded'].includes(order.status);
            return (
              <li key={order.id} className="ui-card overflow-hidden">
                {/* Header */}
                <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-extrabold tracking-wide" style={{ color: 'var(--fg)' }}>{orderReference(order.id)}</p>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                      Placed {formattedDate} · {count} {count === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <StatusChip status={order.status} />
                </div>

                {/* Items */}
                <ul className="px-4 sm:px-6 py-2 space-y-3">
                  {items.map((item) => {
                    const cancelled = item.status === 'cancelled';
                    const meta = [item.variant?.size && `Size ${item.variant.size}`, item.variant?.color, `Qty ${item.quantity}`].filter(Boolean).join(' · ');
                    const name = item.product?.name ?? 'WAR Apparel';
                    return (
                      <li key={item.id} className="flex items-center gap-3 sm:gap-4">
                        <div className="relative w-14 h-16 sm:w-16 sm:h-20 flex-shrink-0 overflow-hidden rounded-xl"
                          style={{ background: 'var(--surface-2)', opacity: cancelled ? 0.5 : 1 }}>
                          <ProductImage src={item.product?.images?.[0]?.url} alt={name} sizes="64px" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold leading-snug truncate"
                            style={{ color: cancelled ? 'var(--fg-subtle)' : 'var(--fg)', textDecoration: cancelled ? 'line-through' : 'none' }}>
                            {name}
                          </p>
                          <p className="text-sm mt-0.5" style={{ color: 'var(--fg-muted)' }}>{meta}</p>
                          {cancelled && <span className="ui-chip ui-chip-bad mt-1">Cancelled</span>}
                        </div>
                        <span className="text-[15px] font-bold whitespace-nowrap" style={{ color: 'var(--fg)' }}>
                          {formatPrice(item.total_price || item.unit_price * item.quantity)}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* Footer */}
                <div className="mt-3 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-t"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <Meta label="Order total"><span className="text-base font-extrabold">{formatPrice(order.total)}</span></Meta>
                    <Meta label="Payment">{paymentLabel(order)}</Meta>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    {trackable && (
                      <Link href={`/track-order?order=${order.id}`} className="ui-btn-ghost flex-1 sm:flex-none !py-2.5 text-sm">
                        <Truck size={15} /> Track
                      </Link>
                    )}
                    <Link href={`/account/orders/${order.id}`} className="ui-btn flex-1 sm:flex-none !py-2.5 text-sm">
                      View details <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AccountShell>
  );
}
