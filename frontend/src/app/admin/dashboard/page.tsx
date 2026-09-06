'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { createClient } from '@/lib/supabase/client';
import {
  TrendingUp,
  ShoppingCart,
  Users,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
} from 'lucide-react';

const STATS_DEFAULT = [
  { label: 'Total Revenue', value: '₹4,82,350', change: '+12.5%', up: true, icon: TrendingUp, color: '#22c55e' },
  { label: 'Orders Today', value: '147', change: '+8.2%', up: true, icon: ShoppingCart, color: 'var(--primary)' },
  { label: 'New Customers', value: '38', change: '-3.1%', up: false, icon: Users, color: 'var(--accent)' },
  { label: 'Active Products', value: '84', change: '+5', up: true, icon: Package, color: '#a855f7' },
];

const RECENT_ORDERS_DEFAULT = [
  { id: '#WAR-10482', customer: 'Arjun Sharma', product: 'Midnight Oversized Tee', amount: '₹1,499', status: 'Delivered', time: '2 min ago' },
  { id: '#WAR-10481', customer: 'Ravi Kumar', product: 'Essential White Classic', amount: '₹799', status: 'Shipped', time: '15 min ago' },
  { id: '#WAR-10480', customer: 'Deepak Nair', product: 'Acid Wash Vintage', amount: '₹1,299', status: 'Processing', time: '32 min ago' },
  { id: '#WAR-10479', customer: 'Karthik M', product: 'Graphic City Tee', amount: '₹999', status: 'Pending', time: '1 hr ago' },
  { id: '#WAR-10478', customer: 'Suresh Babu', product: 'Premium Pima Cotton', amount: '₹2,199', status: 'Delivered', time: '2 hr ago' },
];

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  Delivered: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
  Shipped: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  Processing: { bg: 'rgba(234,179,8,0.12)', color: '#eab308' },
  Pending: { bg: 'rgba(156,163,175,0.12)', color: '#9ca3af' },
  Cancelled: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  Delivered: <CheckCircle2 size={12} />,
  Shipped: <Truck size={12} />,
  Processing: <Clock size={12} />,
  Pending: <AlertCircle size={12} />,
};

const TOP_PRODUCTS = [
  { name: 'Midnight Oversized Tee', sold: 342, revenue: '₹5,12,958', stock: 45, pct: 88 },
  { name: 'Essential White Classic', sold: 289, revenue: '₹2,30,911', stock: 120, pct: 74 },
  { name: 'Graphic City Tee', sold: 215, revenue: '₹2,14,785', stock: 32, pct: 55 },
  { name: 'Premium Pima Cotton', sold: 178, revenue: '₹3,91,222', stock: 18, pct: 46 },
];

const REVENUE_BARS = [
  { day: 'Mon', value: 68 },
  { day: 'Tue', value: 82 },
  { day: 'Wed', value: 55 },
  { day: 'Thu', value: 90 },
  { day: 'Fri', value: 75 },
  { day: 'Sat', value: 95 },
  { day: 'Sun', value: 60 },
];

export default function AdminDashboardPage() {
  const { admin } = useAdminStore();
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState(STATS_DEFAULT);
  const [recentOrders, setRecentOrders] = useState(RECENT_ORDERS_DEFAULT);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const { data: ordersData } = await (supabase as any).from('orders').select('*');
        const { data: productsData } = await (supabase as any).from('products').select('*');

        if (ordersData && ordersData.length > 0) {
          const totalRev = ordersData.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
          const activeProdsCount = productsData?.length ?? 84;

          setStats([
            { label: 'Total Revenue', value: `₹${totalRev.toLocaleString()}`, change: '+14.2%', up: true, icon: TrendingUp, color: '#22c55e' },
            { label: 'Total Orders', value: String(ordersData.length), change: '+9.4%', up: true, icon: ShoppingCart, color: 'var(--primary)' },
            { label: 'New Customers', value: String(Math.max(12, Math.round(ordersData.length * 0.7))), change: '+4.1%', up: true, icon: Users, color: 'var(--accent)' },
            { label: 'Active Products', value: String(activeProdsCount), change: '+3', up: true, icon: Package, color: '#a855f7' },
          ]);

          const recentMapped = ordersData.slice(0, 5).map((o: any) => {
            const addr = o.delivery_address || {};
            const st = (o.status || 'processing').toLowerCase();
            let statusName = 'Processing';
            if (st === 'shipped') statusName = 'Shipped';
            else if (st === 'delivered') statusName = 'Delivered';
            else if (st === 'cancelled') statusName = 'Cancelled';
            else if (st === 'pending') statusName = 'Pending';

            return {
              id: `#${o.order_number || o.order_id.slice(0, 8)}`,
              customer: addr.full_name || 'Customer',
              product: 'WAR Essential Order',
              amount: `₹${Number(o.total || 0).toLocaleString()}`,
              status: statusName,
              time: 'Just now',
            };
          });
          setRecentOrders(recentMapped);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard metrics from Supabase', err);
      }
    };
    loadDashboardData();
  }, [supabase]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Good day, {admin?.name?.split(' ')[0] || 'Admin'} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
          Here&apos;s what&apos;s happening with WAR (Without Any Regrets) today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl p-5"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${stat.color}20` }}
                >
                  <Icon size={18} style={{ color: stat.color }} />
                </div>
                <span
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: stat.up ? '#22c55e' : '#ef4444' }}
                >
                  {stat.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {stat.change}
                </span>
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{stat.label}</div>
            </div>
          );
        })}
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
              <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>June 3 – June 9, 2026</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">₹82,450</div>
              <div className="text-xs flex items-center gap-1 justify-end" style={{ color: '#22c55e' }}>
                <ArrowUpRight size={11} /> 12.5% vs last week
              </div>
            </div>
          </div>
          <div className="flex items-end gap-3 h-32">
            {REVENUE_BARS.map((bar) => (
              <div key={bar.day} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full rounded-t-lg transition-all" style={{
                  height: `${bar.value}%`,
                  background: bar.day === 'Sun' ? 'var(--fg-muted)' : 'var(--primary)',
                  opacity: bar.day === 'Sun' ? 0.4 : 1,
                }} />
                <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{bar.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order status donut */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <h2 className="font-semibold mb-6">Order Status</h2>
          <div className="space-y-4">
            {[
              { label: 'Delivered', count: 1240, pct: 62, color: '#22c55e' },
              { label: 'Shipped', count: 380, pct: 19, color: '#3b82f6' },
              { label: 'Processing', count: 260, pct: 13, color: '#eab308' },
              { label: 'Pending', count: 120, pct: 6, color: '#9ca3af' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    <span style={{ color: 'var(--fg-muted)' }}>{item.label}</span>
                  </div>
                  <span className="font-semibold">{item.count}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.pct}%`, background: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="text-xs" style={{ color: 'var(--fg-muted)' }}>Total orders this month</div>
            <div className="text-2xl font-bold mt-0.5">2,000</div>
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
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {recentOrders.map((order, idx) => {
              const style = STATUS_STYLES[order.status] || STATUS_STYLES.Processing;
              return (
                <div key={order.id ? `${order.id}-${idx}` : `ro-${idx}`} className="flex items-center gap-4 px-6 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{order.id}</span>
                      <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{order.time}</span>
                    </div>
                    <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--fg-muted)' }}>
                      {order.customer} · {order.product}
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
            {TOP_PRODUCTS.map((p, i) => (
              <div key={`${p.name}-${i}`}>
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
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${p.pct}%`, background: 'var(--primary)' }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>Stock: {p.stock}</span>
                  <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{p.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
