import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { toAdminOrderRow } from '@/lib/admin/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/orders — all orders with items and customer email (admin only). */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const supabase = getServiceClient();
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`*, order_items(id, quantity, unit_price, total_price, status,
      product:products(name),
      variant:product_variants(color:colors(name), size_option:size_options(name)))`)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('/api/admin/orders GET error:', error);
    return NextResponse.json({ error: 'Could not load orders.' }, { status: 500 });
  }

  const userIds = [...new Set((orders ?? []).map((o: any) => o.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, email').in('id', userIds)
    : { data: [] };
  const emailById = new Map((profiles ?? []).map((p: any) => [p.id, p.email]));

  return NextResponse.json({
    orders: (orders ?? []).map((o: any) => toAdminOrderRow({ ...o, profile: { email: emailById.get(o.user_id) } })),
  });
}
