import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/apiAuth';
import { CancelError, cancelOrderItem } from '@/lib/checkout/cancel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as any;
}

/**
 * POST /api/payments/razorpay/refund
 * Body: { order_id, item_id, reason? }
 * Cancels one item of the signed-in customer's own order (before it ships), refunding online payments.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { order_id, item_id, reason } = await request.json();
  if (!order_id || !item_id) {
    return NextResponse.json({ error: 'order_id and item_id are required' }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', order_id)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  try {
    const result = await cancelOrderItem(supabase, order, item_id, String(reason || 'Customer cancelled item'));
    return NextResponse.json({
      success: true,
      message: result.refundId
        ? `Item cancelled. ₹${result.refundAmount} will be refunded to your original payment method in 5–7 working days.`
        : 'Item cancelled successfully.',
      refund_id: result.refundId,
      refund_amount: result.refundAmount,
      new_total: result.newTotal,
      new_status: result.newStatus,
    });
  } catch (err) {
    if (err instanceof CancelError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
