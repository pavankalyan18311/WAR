import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/apiAuth';
import { dispatchShipment } from '@/lib/checkout/fulfil';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as any;
}

/**
 * POST /api/shipping/create-order  (admin only)
 * Body: { order_id }
 * (Re)books the Shiprocket shipment for an order, e.g. if automatic booking failed.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { order_id } = await request.json();
  if (!order_id) return NextResponse.json({ error: 'order_id is required' }, { status: 400 });

  const supabase = getAdminClient();
  const { data: order } = await supabase.from('orders').select('id, user_id').eq('id', order_id).maybeSingle();
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const { data: profile } = await supabase.from('profiles').select('email').eq('id', order.user_id).maybeSingle();
  const result = await dispatchShipment(supabase, order.id, profile?.email ?? '');
  if (result.status === 'failed') return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ success: true, status: result.status });
}
