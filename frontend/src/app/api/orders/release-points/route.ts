import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { restorePoints } from '@/lib/rewards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orders/release-points — Body: { order_id }
 * Called when the customer closes the Razorpay window: gives back the reward points held for that unpaid order.
 * (If the payment still completes later, verify-payment takes the points again.)
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { order_id } = await request.json().catch(() => ({}));
  if (!order_id) return NextResponse.json({ error: 'order_id is required.' }, { status: 400 });

  const supabase = getServiceClient();
  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id, status, payment_status, points_used')
    .eq('id', order_id)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

  const unpaid = order.status === 'pending' && order.payment_status !== 'paid';
  if (!unpaid || !(Number(order.points_used) > 0)) return NextResponse.json({ restored: 0 });

  return NextResponse.json({ restored: await restorePoints(supabase, order.id) });
}
