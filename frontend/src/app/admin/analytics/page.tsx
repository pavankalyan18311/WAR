'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { buildAnalytics, type Analytics } from '@/lib/analytics';
import { TrendingUp, ShoppingCart, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total, status, payment_status, created_at');

      if (error) {
        console.error('Failed to fetch analytics from Supabase', error);
        setError('Could not load analytics. Please refresh.');
        return;
      }
      setAnalytics(buildAnalytics(data ?? []));
    };
    fetchAnalytics();
  }, [supabase]);

  const change = analytics?.revenueChangePct ?? null;
  const maxDayRevenue = Math.max(1, ...(analytics?.last7Days.map((d) => d.revenue) ?? [0]));

  const cards = [
    { label: 'Gross Revenue', value: analytics ? `₹${analytics.totalRevenue.toLocaleString('en-IN')}` : '—', icon: TrendingUp, color: '#22c55e' },
    { label: 'Orders', value: analytics ? analytics.totalOrders.toLocaleString('en-IN') : '—', icon: ShoppingCart, color: '#3b82f6' },
    { label: 'Average Order Value', value: analytics ? `₹${analytics.averageOrderValue.toLocaleString('en-IN')}` : '—', icon: Package, color: '#a855f7' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics & Reports</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
          Sales from all orders except cancelled, refunded or failed payments
        </p>
      </div>

      {error && (
        <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}26`, color }}>
              <Icon size={18} />
            </div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold">Last 7 Days</h2>
          {change !== null && (
            <span className={`text-xs font-semibold flex items-center gap-0.5 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {change >= 0 ? '+' : ''}{change}% vs previous 7 days
            </span>
          )}
        </div>
        {!analytics ? (
          <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--fg-muted)' }}>
            {error ? '—' : 'Loading…'}
          </div>
        ) : (
          <div className="flex items-end gap-4 h-48 pt-6">
            {analytics.last7Days.map((d) => (
              <div key={d.date} className="flex-1 h-full flex flex-col items-center justify-end gap-2"
                title={`₹${d.revenue.toLocaleString('en-IN')} · ${d.orders} orders`}>
                <div className="w-full rounded-t-lg transition-all"
                  style={{ height: `${(d.revenue / maxDayRevenue) * 100}%`, minHeight: 2, background: 'var(--primary)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>
                  {new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
