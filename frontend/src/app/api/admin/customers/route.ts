import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/apiAuth';
import { isCountedSale } from '@/lib/analytics';
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

/** GET /api/admin/customers — list all customers with real order stats */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const supabase = getAdminClient();

    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profErr) throw profErr;
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ customers: [] });
    }

    const { data: orderRows } = await supabase
      .from('orders')
      .select('user_id, total, status, payment_method, payment_status, created_at')
      .in('user_id', profiles.map((p: any) => p.id));

    // Spendable reward points per customer (unspent and not expired).
    const { data: pointRows } = await supabase
      .from('reward_points')
      .select('user_id, remaining, expires_at')
      .eq('kind', 'earn')
      .gt('remaining', 0);
    const now = Date.now();
    const pointsByUser: Record<string, number> = {};
    for (const r of pointRows ?? []) {
      if (new Date(r.expires_at).getTime() > now) pointsByUser[r.user_id] = (pointsByUser[r.user_id] ?? 0) + Number(r.remaining);
    }

    const statsByUser: Record<string, { count: number; total: number }> = {};
    for (const o of orderRows ?? []) {
      // Only real sales: not cancelled/refunded/failed, and not abandoned online payments.
      if (!isCountedSale(o) || isAbandonedPayment(o)) continue;
      if (!statsByUser[o.user_id]) statsByUser[o.user_id] = { count: 0, total: 0 };
      statsByUser[o.user_id].count += 1;
      statsByUser[o.user_id].total += Number(o.total ?? 0);
    }

    const customers = profiles.map((p: any) => ({
      id: p.id,
      name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Customer',
      email: p.email || '',
      phone: p.phone || 'N/A',
      orders_count: statsByUser[p.id]?.count ?? 0,
      total_spent: Math.round(statsByUser[p.id]?.total ?? 0),
      reward_points: pointsByUser[p.id] ?? 0,
      created_at: p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '',
      role: p.role || 'customer',
    }));

    return NextResponse.json({ customers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
