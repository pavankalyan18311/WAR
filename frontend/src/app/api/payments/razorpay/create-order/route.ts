import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/apiAuth';
import { CheckoutError, priceOrder, supabasePricingDeps } from '@/lib/checkout/priceOrder';
import { validateShippingAddress } from '@/lib/checkout/address';
import { createRazorpayOrder, razorpayConfigured, razorpayKeyId, toPaise } from '@/lib/razorpayServer';
import { redeemPoints } from '@/lib/rewards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as any;
}

/**
 * POST /api/payments/razorpay/create-order
 * Body: { items: [{ variant_id, quantity }], coupon_code?, points_to_use?, shipping_address }
 * Prices the cart on the server, saves a pending order and opens a Razorpay order for that exact amount.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  if (!razorpayConfigured()) {
    return NextResponse.json({ error: 'Online payment is not available right now.' }, { status: 503 });
  }

  const supabase = getAdminClient();
  try {
    const body = await request.json();
    const address = validateShippingAddress(body.shipping_address);
    const priced = await priceOrder(supabasePricingDeps(supabase, auth.user.id), {
      items: body.items,
      couponCode: body.coupon_code,
      pointsToUse: body.points_to_use,
    });
    const pointsUsed = priced.pointsUsed ?? 0;
    if (priced.totals.total <= 0) {
      throw new CheckoutError('Your reward points cover this whole order — choose "Pay with points" to place it.');
    }

    const orderId = crypto.randomUUID();
    const amountPaise = toPaise(priced.totals.total);
    const rzpOrder = await createRazorpayOrder(amountPaise, orderId, { order_id: orderId, user_id: auth.user.id });

    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      user_id: auth.user.id,
      status: 'pending',
      payment_method: 'card', // replaced with the real method once the payment is verified
      payment_status: 'pending',
      ...priced.totals,
      ...(pointsUsed > 0 ? { points_used: pointsUsed } : {}),
      coupon_code: priced.couponCode,
      shipping_address: address,
      razorpay_order_id: rzpOrder.id,
    });
    const { error: itemsError } = orderError
      ? { error: null }
      : await supabase.from('order_items').insert(
          priced.lines.map((l) => ({
            order_id: orderId,
            product_id: l.product_id,
            variant_id: l.variant_id,
            quantity: l.quantity,
            unit_price: l.unit_price,
            total_price: l.total_price,
          })),
        );

    if (orderError || itemsError) {
      console.error('razorpay create-order save error:', orderError ?? itemsError);
      if (!orderError) await supabase.from('orders').delete().eq('id', orderId);
      return NextResponse.json({ error: 'Could not start payment. Please try again.' }, { status: 500 });
    }

    // Hold the points for this order now; they are given back if the payment window is closed.
    if (pointsUsed > 0 && !(await redeemPoints(supabase, auth.user.id, orderId, pointsUsed))) {
      await supabase.from('order_items').delete().eq('order_id', orderId);
      await supabase.from('orders').delete().eq('id', orderId);
      return NextResponse.json({ error: 'Your reward points balance changed. Please review your order.' }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      order_id: orderId,
      razorpay_order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      key_id: razorpayKeyId(),
      totals: priced.totals,
      points_used: pointsUsed,
    });
  } catch (err) {
    if (err instanceof CheckoutError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error('razorpay create-order exception:', err);
    return NextResponse.json({ error: 'Could not start payment. Please try again.' }, { status: 500 });
  }
}
