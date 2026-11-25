import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/apiAuth';
import { afterOrderConfirmed, reserveStock } from '@/lib/checkout/fulfil';
import { fetchRazorpayPayment, isValidPaymentSignature, toDbPaymentMethod, toPaise } from '@/lib/razorpayServer';
import { redeemPoints } from '@/lib/rewards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as any;
}

/**
 * POST /api/payments/razorpay/verify-payment
 * Body: { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Confirms the pending order only if the signature is valid AND Razorpay says the right amount was paid.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();
  if (!order_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing payment details.' }, { status: 400 });
  }
  if (!isValidPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return NextResponse.json({ error: 'Payment verification failed.' }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', order_id)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (!order || order.razorpay_order_id !== razorpay_order_id) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }
  if (order.payment_status === 'paid') {
    return NextResponse.json({ success: true, order_id: order.id });
  }

  try {
    const payment = await fetchRazorpayPayment(razorpay_payment_id);
    const paid = ['captured', 'authorized'].includes(payment.status);
    if (!paid || payment.order_id !== razorpay_order_id || payment.amount !== toPaise(order.total)) {
      console.error('Razorpay payment mismatch', { order_id, payment });
      return NextResponse.json({ error: 'Payment amount could not be verified. Please contact support.' }, { status: 400 });
    }

    // Claim the order atomically: only the request that flips it from pending → paid continues,
    // so a repeated/simultaneous confirmation can't take stock or send emails twice.
    const { data: claimed } = await supabase
      .from('orders')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        payment_method: toDbPaymentMethod(payment.method),
        razorpay_payment_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('payment_status', 'pending')
      .select('id');
    if (!claimed?.length) return NextResponse.json({ success: true, order_id: order.id });

    const { data: items } = await supabase.from('order_items').select('variant_id, quantity').eq('order_id', order.id);
    const stockOk = await reserveStock(
      supabase,
      (items ?? []).map((i: any) => ({ variant_id: i.variant_id, quantity: i.quantity })),
    );
    if (!stockOk) {
      console.error('STOCK SHORTFALL on paid order — needs admin attention:', order.id);
      await supabase
        .from('orders')
        .update({ notes: 'STOCK SHORTFALL: paid but stock ran out — contact customer / refund.' })
        .eq('id', order.id);
    }

    // Points are normally still held for this order; if they were given back (payment window closed)
    // take them again. If they have been spent elsewhere meanwhile, flag it for the admin.
    const pointsUsed = Number(order.points_used ?? 0);
    if (pointsUsed > 0 && !(await redeemPoints(supabase, auth.user.id, order.id, pointsUsed))) {
      console.error('POINTS SHORTFALL on paid order:', order.id);
      await supabase
        .from('orders')
        .update({ notes: `POINTS SHORTFALL: ${pointsUsed} points were applied but are no longer available.` })
        .eq('id', order.id);
    }

    try {
      await afterOrderConfirmed(supabase, {
        id: order.id,
        userId: auth.user.id,
        couponCode: order.coupon_code,
        customerEmail: auth.user.email ?? '',
      });
    } catch (err) {
      console.error('verify-payment post-confirmation step failed (order is paid):', err);
    }

    return NextResponse.json({ success: true, order_id: order.id });
  } catch (err) {
    console.error('verify-payment exception:', err);
    return NextResponse.json({ error: 'Payment verification failed. If money was debited, contact support.' }, { status: 500 });
  }
}
