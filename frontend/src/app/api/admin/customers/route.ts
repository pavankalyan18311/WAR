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

/** GET /api/admin/customers — list all customers with real order stats */
export async function GET() {
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
      .select('user_id, total')
      .in('user_id', profiles.map((p: any) => p.id));

    const statsByUser: Record<string, { count: number; total: number }> = {};
    for (const o of orderRows ?? []) {
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
      created_at: p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '',
      role: p.role || 'customer',
    }));

    return NextResponse.json({ customers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
