import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { CancelError, cancelOrderItem } from '@/lib/checkout/cancel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/admin/orders/[id]/cancel — cancels every remaining item: refunds online payments and restocks. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await params;
  const supabase = getServiceClient();
  const { data: order } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  const { data: items } = await supabase.from('order_items').select('id, status').eq('order_id', id);
  let refunded = 0;
  try {
    for (const item of (items ?? []).filter((it: any) => it.status !== 'cancelled')) {
      const result = await cancelOrderItem(supabase, order, item.id, 'Cancelled by store');
      refunded += result.refundAmount;
    }
  } catch (err) {
    if (err instanceof CancelError) return NextResponse.json({ error: err.message, refunded }, { status: err.status });
    throw err;
  }
  return NextResponse.json({ success: true, refunded });
}
