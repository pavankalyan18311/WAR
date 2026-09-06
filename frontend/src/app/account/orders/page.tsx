'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, ArrowLeft, ExternalLink, Clock, CheckCircle2, Truck, RefreshCw, AlertCircle, User, Heart, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { createClient } from '@/lib/supabase/client';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
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
  created_at: string;
  order_items?: OrderItem[];
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  pending: { label: 'Pending Payment', bg: 'rgba(234, 179, 8, 0.12)', text: '#eab308', icon: Clock },
  confirmed: { label: 'Order Confirmed', bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6', icon: CheckCircle2 },
  processing: { label: 'Processing', bg: 'rgba(168, 85, 247, 0.12)', text: '#a855f7', icon: RefreshCw },
  shipped: { label: 'Out for Delivery', bg: 'rgba(14, 165, 233, 0.12)', text: '#0ea5e9', icon: Truck },
  delivered: { label: 'Delivered', bg: 'rgba(34, 197, 94, 0.12)', text: '#22c55e', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', icon: AlertCircle },
};

const NAV_LINKS = [
  { href: '/account/profile', label: 'Profile & Addresses', icon: User },
  { href: '/account/orders', label: 'My Orders', icon: Package, active: true },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
];

export default function UserOrdersPage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      let apiOrders: Order[] = [];

      if (user?.id) {
        try {
          const response = await fetch(`/api/orders?user_id=${user.id}`);
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


  const displayName = user?.user_metadata?.first_name || (user as any)?.name || 'Customer';
  const displayEmail = user?.email || '';

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
          <p className="text-xs font-bold tracking-[0.3em] uppercase mb-1" style={{ color: 'var(--accent)' }}>Dashboard</p>
          <h1 className="text-2xl font-black" style={{ color: 'var(--fg)' }}>My Orders</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>Track, manage, and view your purchase history</p>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden border-b overflow-x-auto no-scrollbar" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex px-5 py-2.5 gap-2 min-w-max">
          {NAV_LINKS.map(({ href, label, icon: Icon, active }) => (
            <Link key={href} href={href}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: active ? 'var(--primary)' : 'var(--bg-elevated)',
                color: active ? 'var(--primary-fg)' : 'var(--fg-muted)',
                border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
              }}>
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <aside className="hidden md:block w-48 flex-shrink-0">
            <nav className="space-y-1">
              {NAV_LINKS.map(({ href, label, icon: Icon, active }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: active ? 'var(--bg-elevated)' : 'transparent',
                    color: active ? 'var(--fg)' : 'var(--fg-muted)',
                    border: active ? '1px solid var(--border)' : '1px solid transparent',
                  }}>
                  <Icon size={15} />
                  {label}
                </Link>
              ))}
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-70"
                onClick={async () => { await logout(); }}
                style={{ color: 'var(--danger)' }}
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </nav>
          </aside>

          {/* Orders List */}
          <div className="flex-1 min-w-0 space-y-6">
            {loading ? (
              <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <RefreshCw size={28} className="animate-spin mx-auto mb-3" style={{ color: 'var(--accent)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>Loading your orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <ScrollReveal animation="fade-up">
                <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <Package size={48} className="mx-auto mb-4" style={{ color: 'var(--fg-subtle)' }} />
                  <h3 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>No orders yet</h3>
                  <p className="text-sm mt-1 mb-6 max-w-sm mx-auto" style={{ color: 'var(--fg-muted)' }}>
                    Looks like you haven't placed any orders yet. Discover our latest oversized collection and drop shirts!
                  </p>
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                    style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
                  >
                    Explore Shop
                  </Link>
                </div>
              </ScrollReveal>
            ) : (
              orders.map((order) => {
                const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusInfo.icon;
                const formattedDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <ScrollReveal key={order.id} animation="fade-up">
                    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      {/* Top Bar */}
                      <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                        <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--fg-muted)' }}>
                          <div>
                            <span className="font-bold block uppercase text-[10px] tracking-wider">Order ID</span>
                            <span className="font-mono text-sm font-bold" style={{ color: 'var(--fg)' }}>#{order.id.slice(0, 8)}</span>
                          </div>
                          <div>
                            <span className="font-bold block uppercase text-[10px] tracking-wider">Date Placed</span>
                            <span style={{ color: 'var(--fg)' }}>{formattedDate}</span>
                          </div>
                          <div>
                            <span className="font-bold block uppercase text-[10px] tracking-wider">Total Amount</span>
                            <span className="font-bold" style={{ color: 'var(--fg)' }}>₹{order.total}</span>
                          </div>
                        </div>

                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                          style={{ background: statusInfo.bg, color: statusInfo.text }}
                        >
                          <StatusIcon size={12} />
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="p-6 space-y-4">
                        {order.order_items?.map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xs" style={{ background: 'var(--bg-elevated)' }}>
                                <Package size={20} style={{ color: 'var(--fg-subtle)' }} />
                              </div>
                              <div>
                                <p className="font-bold text-sm" style={{ color: 'var(--fg)' }}>{item.product?.name ?? 'WAR Apparel'}</p>
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                  Qty: {item.quantity} {item.variant?.size ? `· Size: ${item.variant.size}` : ''} {item.variant?.color ? `· Color: ${item.variant.color}` : ''}
                                </p>
                              </div>
                            </div>
                            <span className="font-bold text-sm" style={{ color: 'var(--fg)' }}>₹{item.total_price || item.unit_price * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Footer Actions */}
                      <div className="px-6 py-3 flex items-center justify-between text-xs" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                        <span style={{ color: 'var(--fg-muted)' }}>
                          Payment: <strong style={{ color: 'var(--fg)' }}>
                            {(() => {
                              let notesObj: any = {};
                              if (typeof order.notes === 'string') {
                                try { notesObj = JSON.parse(order.notes); } catch (e) {}
                              } else if (typeof order.notes === 'object' && order.notes !== null) {
                                notesObj = order.notes;
                              }
                              const gateway = notesObj.gateway || order.shipping_address?.gateway;
                              const detail = notesObj.payment_method_detail || order.shipping_address?.payment_method_detail || order.payment_method || 'ONLINE';
                              const wallet = notesObj.wallet || order.shipping_address?.wallet;
                              if (gateway === 'Razorpay') {
                                return `RAZORPAY (${detail.toUpperCase()}${wallet ? ` - ${wallet.toUpperCase()}` : ''})`;
                              }
                              return (order.payment_method || 'COD').toUpperCase();
                            })()}
                          </strong> ({order.payment_status})
                        </span>
                        <div className="flex items-center gap-3">
                          {order.tracking_number && (
                            <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                              Tracking: #{order.tracking_number}
                            </span>
                          )}
                          <Link href={`/account/orders/${order.id}`} className="font-bold flex items-center gap-1 hover:underline" style={{ color: 'var(--fg)' }}>
                            View Details <ExternalLink size={12} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
