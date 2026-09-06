'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart2,
  TrendingUp,
  ShoppingCart,
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Package,
} from 'lucide-react';

const REVENUE_BARS = [
  { day: 'Mon', revenue: 14200, orders: 12 },
  { day: 'Tue', revenue: 18900, orders: 16 },
  { day: 'Wed', revenue: 12500, orders: 10 },
  { day: 'Thu', revenue: 24000, orders: 21 },
  { day: 'Fri', revenue: 19800, orders: 17 },
  { day: 'Sat', value: 28500, orders: 25 },
  { day: 'Sun', revenue: 16400, orders: 14 },
];

export default function AdminAnalyticsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [totalRevenue, setTotalRevenue] = useState(134300);
  const [totalOrders, setTotalOrders] = useState(115);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data: orders } = await (supabase as any)
          .from('orders')
          .select('total');

        if (orders && orders.length > 0) {
          const rev = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
          setTotalRevenue(rev);
          setTotalOrders(orders.length);
        }
      } catch (err) {
        console.error('Failed to fetch analytics from Supabase', err);
      }
    };
    fetchAnalytics();
  }, [supabase]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics & Reports</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
          Real-time performance metrics and sales statistics
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
              <TrendingUp size={18} />
            </div>
            <span className="text-xs font-semibold flex items-center gap-0.5 text-green-500">
              <ArrowUpRight size={12} /> +15.4%
            </span>
          </div>
          <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Gross Revenue</div>
        </div>

        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
              <ShoppingCart size={18} />
            </div>
            <span className="text-xs font-semibold flex items-center gap-0.5 text-blue-500">
              <ArrowUpRight size={12} /> +8.2%
            </span>
          </div>
          <div className="text-2xl font-bold">{totalOrders}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Completed Orders</div>
        </div>

        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
              <Package size={18} />
            </div>
            <span className="text-xs font-semibold flex items-center gap-0.5 text-purple-500">
              <ArrowUpRight size={12} /> +4.5%
            </span>
          </div>
          <div className="text-2xl font-bold">₹{Math.round(totalRevenue / Math.max(1, totalOrders)).toLocaleString()}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Average Order Value</div>
        </div>

        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>
              <Users size={18} />
            </div>
            <span className="text-xs font-semibold flex items-center gap-0.5 text-orange-500">
              <ArrowUpRight size={12} /> +11.0%
            </span>
          </div>
          <div className="text-2xl font-bold">3.2%</div>
          <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>Store Conversion Rate</div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h2 className="text-base font-bold mb-4">Daily Sales Performance</h2>
        <div className="flex items-end gap-4 h-48 pt-6">
          {REVENUE_BARS.map((b, idx) => (
            <div key={`${b.day}-${idx}`} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full rounded-t-lg transition-all"
                style={{
                  height: `${(b.revenue / 30000) * 100}%`,
                  background: 'var(--primary)',
                }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>{b.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
