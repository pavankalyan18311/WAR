'use client';

import { useState, useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';
import {
  TrendingUp,
  ShoppingCart,
  Users,
  Package,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Delivered: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  Shipped: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  Confirmed: { bg: 'rgba(99,102,241,0.12)', color: '#6366f1' },
  Processing: { bg: 'rgba(234,179,8,0.12)', color: '#eab308' },
  Pending: { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af' },
  Cancelled: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  Refunded: { bg: 'rgba(249,115,22,0.12)', color: '#f97316' },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  Delivered: <CheckCircle2 size={12} />,
  Shipped: <Truck size={12} />,
  Processing: <Clock size={12} />,
  Pending: <AlertCircle size={12} />,
};

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
}

interface WeeklyBar {
  label: string;
  value: number;
  pct: number;
}

interface StatusItem {
  label: string;
  count: number;
  pct: number;
  color: string;
}

interface TopProduct {
  id: string;
  name: string;
  sold: number;
  revenue: number;
  pct: number;
}

interface RecentOrder {
  id: string;
  customer: string;
  amount: string;
  status: string;
  time: string;
}

export default function AdminDashboardPage() {
  const { admin } = useAdminStore();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weeklyRevenue, setWeeklyRevenue] = useState<WeeklyBar[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard');
      if (res.ok) {
        const dash = await res.json();
        setStats(dash.stats);
        setWeeklyRevenue(dash.weeklyRevenue ?? []);
        setStatusBreakdown(dash.statusBreakdown ?? []);
        setTopProducts(dash.topProducts ?? []);
        setRecentOrders(dash.recentOrders ?? []);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const totalWeekRevenue = weeklyRevenue.reduce((sum, d) => sum + d.value, 0);

  const STAT_CONFIGS = [
    { key: 'totalRevenue' as const, label: 'Total Revenue', icon: TrendingUp, color: '#22c55e', format: (v: number) => `₹${v.toLocaleString()}` },
    { key: 'totalOrders' as const, label: 'Total Orders', icon: ShoppingCart, color: 'var(--primary)', format: (v: number) => String(v) },
    { key: 'totalCustomers' as const, label: 'Customers', icon: Users, color: 'var(--accent)', format: (v: number) => String(v) },
    { key: 'totalProducts' as const, label: 'Active Products', icon: Package, color: '#a855f7', format: (v: number) => String(v) },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Good day, {admin?.name?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
            Here&apos;s what&apos;s happening with WAR today.
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="p-2 rounded-xl transition-all"
          style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CONFIGS.map(({ key, label, icon: Icon, color, format }) => (
          <div
            key={key}
            className="rounded-2xl p-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#22c55e' }}>
                <ArrowUpRight size={12} />
                Live
              </span>
            </div>
            <div className="text-2xl font-bold">
              {loading ? '—' : stats ? format(stats[key]) : '—'}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue bar chart */}
        <div
          className="lg:col-span-2 rounded-2xl p-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold">Weekly Revenue</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>Last 7 days</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">₹{totalWeekRevenue.toLocaleString()}</div>
              <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>this week</div>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-32" style={{ color: 'var(--fg-muted)' }}>
              <RefreshCw size={18} className="animate-spin mr-2" /> Loading…
            </div>
          ) : weeklyRevenue.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--fg-muted)' }}>
              No orders in the last 7 days
            </div>
          ) : (
            <div className="flex items-end gap-3 h-32">
              {weeklyRevenue.map((bar, i) => (
                <div key={`${bar.label}-${i}`} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-lg transition-all"
                    style={{
                      height: `${Math.max(bar.pct, 4)}%`,
                      background: bar.pct === 0 ? 'var(--bg-subtle)' : 'var(--primary)',
                      opacity: bar.pct === 0 ? 0.3 : 1,
                    }}
                    title={`₹${bar.value.toLocaleString()}`}
                  />
                  <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{bar.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order status breakdown */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <h2 className="font-semibold mb-6">Order Status</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8" style={{ color: 'var(--fg-muted)' }}>
              <RefreshCw size={18} className="animate-spin" />
            </div>
          ) : statusBreakdown.length === 0 ? (
            <div className="text-center text-sm py-8" style={{ color: 'var(--fg-muted)' }}>No orders yet</div>
          ) : (
            <div className="space-y-4">
              {statusBreakdown.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      <span style={{ color: 'var(--fg-muted)' }}>{item.label}</span>
                    </div>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                    <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>Total orders</div>
            <div className="text-2xl font-bold mt-0.5">{loading ? '—' : (stats?.totalOrders ?? 0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Recent orders */}
        <div
          className="lg:col-span-3 rounded-2xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-semibold">Recent Orders</h2>
            <a href="/admin/orders" className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
              View all →
            </a>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10" style={{ color: 'var(--fg-muted)' }}>
              <RefreshCw size={18} className="animate-spin mr-2" /> Loading…
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-10 text-sm" style={{ color: 'var(--fg-muted)' }}>No recent orders</div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {recentOrders.map((order, idx) => {
                const style = STATUS_STYLES[order.status] || STATUS_STYLES.Processing;
                return (
                  <div key={`${order.id}-${idx}`} className="flex items-center gap-4 px-6 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{order.id}</span>
                        <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{order.time}</span>
                      </div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--fg-muted)' }}>
                        {order.customer}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold">{order.amount}</div>
                      <span
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-0.5"
                        style={{ background: style.bg, color: style.color }}
                      >
                        {STATUS_ICONS[order.status]}
                        {order.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top products */}
        <div
          className="lg:col-span-2 rounded-2xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="font-semibold">Top Products</h2>
            <a href="/admin/products" className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
              View all →
            </a>
          </div>
          <div className="px-6 py-4 space-y-5">
            {loading ? (
              <div className="flex items-center justify-center py-8" style={{ color: 'var(--fg-muted)' }}>
                <RefreshCw size={18} className="animate-spin" />
              </div>
            ) : topProducts.length === 0 ? (
              <div className="text-center text-sm py-8" style={{ color: 'var(--fg-muted)' }}>No sales data yet</div>
            ) : (
              topProducts.map((p, i) => (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                        style={{ background: i === 0 ? 'var(--primary)' : 'var(--bg-subtle)', color: i === 0 ? 'var(--primary-fg)' : 'var(--fg-muted)' }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-xs font-medium truncate max-w-[130px]">{p.name}</span>
                    </div>
                    <span className="text-xs font-semibold">{p.sold} sold</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                    <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: 'var(--primary)' }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>Revenue</span>
                    <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>₹{p.revenue.toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
