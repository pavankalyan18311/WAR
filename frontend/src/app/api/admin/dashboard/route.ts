import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/apiAuth';
import { buildAnalytics, isCountedSale } from '@/lib/analytics';
import { isAbandonedPayment } from '@/lib/admin/orders';
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
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const supabase = getAdminClient();

    const [
      { data: orders },
      { data: products },
      { data: profiles },
      { data: orderItems },
    ] = await Promise.all([
      supabase.from('orders').select('id, total, status, payment_method, payment_status, created_at, user_id, shipping_address'),
      supabase.from('products').select('id, status'),
      supabase.from('profiles').select('id'),
      supabase.from('order_items').select('order_id, product_id, quantity, total_price, status'),
    ]);

    // Unpaid online attempts (customer closed Razorpay) are not orders — see Admin → Orders → Abandoned payments.
    const allOrders = (orders ?? []).filter((o: any) => !isAbandonedPayment(o));
    // Same rules as Admin → Analytics: cancelled, refunded and failed payments are not sales.
    const analytics = buildAnalytics(allOrders);
    const totalRevenue = analytics.totalRevenue;
    const totalOrders = analytics.totalOrders;
    const soldOrderIds = new Set(allOrders.filter(isCountedSale).map((o: any) => o.id));
    const totalProducts = (products ?? []).filter((p: any) => p.status === 'active').length;
    const totalCustomers = (profiles ?? []).length;

    // Weekly revenue: last 7 days (India time)
    const maxRev = Math.max(...analytics.last7Days.map((d) => d.revenue), 1);
    const weeklyRevenue = analytics.last7Days.map((d) => ({
      label: new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' }),
      value: d.revenue,
      pct: Math.round((d.revenue / maxRev) * 100),
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
      if (!item.product_id || item.status === 'cancelled' || !soldOrderIds.has(item.order_id)) continue;
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
          customer: (addr as any).full_name || '',
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
