import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as any;
}

/** GET /api/admin/dashboard — real stats for the admin dashboard */
export async function GET() {
  try {
    const supabase = getAdminClient();

    const [
      { data: orders },
      { data: products },
      { data: profiles },
      { data: orderItems },
    ] = await Promise.all([
      supabase.from('orders').select('id, total, status, created_at, user_id'),
      supabase.from('products').select('id, status'),
      supabase.from('profiles').select('id'),
      supabase.from('order_items').select('product_id, quantity, total_price'),
    ]);

    const allOrders = orders ?? [];
    const totalRevenue = allOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
    const totalOrders = allOrders.length;
    const totalProducts = (products ?? []).filter((p: any) => p.status === 'active').length;
    const totalCustomers = (profiles ?? []).length;

    // Weekly revenue: last 7 days
    const now = new Date();
    const weekSlots: { day: string; label: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      weekSlots.push({
        day: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        revenue: 0,
      });
    }
    for (const o of allOrders) {
      const day = (o.created_at || '').split('T')[0];
      const slot = weekSlots.find((s) => s.day === day);
      if (slot) slot.revenue += Number(o.total) || 0;
    }
    const maxRev = Math.max(...weekSlots.map((s) => s.revenue), 1);
    const weeklyRevenue = weekSlots.map((s) => ({
      label: s.label,
      value: s.revenue,
      pct: Math.round((s.revenue / maxRev) * 100),
    }));

    // Order status breakdown
    const statusCounts: Record<string, number> = {};
    for (const o of allOrders) {
      const s = o.status || 'pending';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }
    const STATUS_COLORS: Record<string, string> = {
      delivered: '#22c55e',
      shipped: '#3b82f6',
      confirmed: '#6366f1',
      processing: '#eab308',
      pending: '#9ca3af',
      cancelled: '#ef4444',
      refunded: '#f97316',
    };
    const statusBreakdown = Object.entries(statusCounts)
      .map(([status, count]) => ({
        label: status.charAt(0).toUpperCase() + status.slice(1),
        count,
        pct: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0,
        color: STATUS_COLORS[status] || '#9ca3af',
      }))
      .sort((a, b) => b.count - a.count);

    // Top products from order_items
    const productStats: Record<string, { qty: number; revenue: number }> = {};
    for (const item of orderItems ?? []) {
      if (!item.product_id) continue;
      if (!productStats[item.product_id]) productStats[item.product_id] = { qty: 0, revenue: 0 };
      productStats[item.product_id].qty += Number(item.quantity) || 0;
      productStats[item.product_id].revenue += Number(item.total_price) || 0;
    }

    const topIds = Object.entries(productStats)
      .sort(([, a], [, b]) => b.qty - a.qty)
      .slice(0, 5)
      .map(([id]) => id);

    let topProducts: any[] = [];
    if (topIds.length > 0) {
      const { data: prodData } = await supabase
        .from('products')
        .select('id, name')
        .in('id', topIds);

      const maxQty = Math.max(...Object.values(productStats).map((s) => s.qty), 1);
      topProducts = (prodData ?? [])
        .map((p: any) => {
          const s = productStats[p.id] || { qty: 0, revenue: 0 };
          return {
            id: p.id,
            name: p.name,
            sold: s.qty,
            revenue: s.revenue,
            pct: Math.round((s.qty / maxQty) * 100),
          };
        })
        .sort((a: any, b: any) => b.sold - a.sold);
    }

    // Recent orders (last 5)
    const recentOrders = allOrders
      .slice()
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((o: any) => {
        const addr = o.shipping_address || {};
        const st = (o.status || 'pending');
        const statusName = st.charAt(0).toUpperCase() + st.slice(1);
        const diffMs = Date.now() - new Date(o.created_at).getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const timeAgo = diffMin < 60
          ? `${diffMin}m ago`
          : diffMin < 1440
          ? `${Math.floor(diffMin / 60)}h ago`
          : `${Math.floor(diffMin / 1440)}d ago`;
        return {
          id: `#${o.id.slice(0, 8).toUpperCase()}`,
          customer: (addr as any).full_name || 'Customer',
          amount: `₹${Number(o.total || 0).toLocaleString()}`,
          status: statusName,
          time: timeAgo,
        };
      });

    return NextResponse.json({
      stats: { totalRevenue, totalOrders, totalCustomers, totalProducts },
      weeklyRevenue,
      statusBreakdown,
      topProducts,
      recentOrders,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
