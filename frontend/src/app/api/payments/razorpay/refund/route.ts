import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_ANON_KEY;

const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_TYUiVucKt34LE4';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '4BLa7x7BWLapSTRy8f0J55AI';

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * POST /api/payments/razorpay/refund
 * Body: { order_id: string, item_id: string, reason?: string }
 * Cancels a specific order item, triggers Razorpay partial refund if online payment, and updates stock inventory.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id, item_id, reason } = body;

    if (!order_id || !item_id) {
      return NextResponse.json({ error: 'order_id and item_id are required' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Fetch Order Record
    const { data: order, error: orderErr } = await (supabase as any)
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. Fetch Order Item Record
    const { data: item, error: itemErr } = await (supabase as any)
      .from('order_items')
      .select('*')
      .eq('id', item_id)
      .single();

    if (itemErr || !item) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 });
    }

    if (item.status === 'cancelled') {
      return NextResponse.json({ error: 'This item has already been cancelled.' }, { status: 400 });
    }

    const refundAmountInINR = Number(item.total_price || (item.unit_price * item.quantity));
    const refundAmountInPaise = Math.round(refundAmountInINR * 100);

    let razorpayRefundData: any = null;

    // 3. Trigger Razorpay Partial Refund if paid via Razorpay
    if (order.payment_method === 'razorpay' && (order.payment_status === 'paid' || order.payment_status === 'confirmed')) {
      // Find Razorpay payment_id from order
      const paymentId = order.razorpay_payment_id || order.payment_id || order.notes?.payment_id;

      if (paymentId) {
        const authHeader = `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`;

        const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: refundAmountInPaise,
            notes: {
              order_id,
              item_id,
              reason: reason || 'Customer requested item cancellation',
            },
          }),
        });

        razorpayRefundData = await rzpRes.json();
        if (!rzpRes.ok || razorpayRefundData.error) {
          console.error('Razorpay Refund API error:', razorpayRefundData);
          // Return error if Razorpay refund fails
          return NextResponse.json({
            error: razorpayRefundData.error?.description || 'Failed to process Razorpay partial refund.',
          }, { status: 400 });
        }
      }
    }

    // 4. Update order_items status to 'cancelled'
    await (supabase as any)
      .from('order_items')
      .update({ status: 'cancelled' })
      .eq('id', item_id);

    // 5. Restock inventory for the cancelled item variant
    if (item.variant_id) {
      const { data: variant } = await (supabase as any)
        .from('product_variants')
        .select('stock_quantity')
        .eq('id', item.variant_id)
        .single();

      if (variant) {
        await (supabase as any)
          .from('product_variants')
          .update({ stock_quantity: (variant.stock_quantity || 0) + item.quantity })
          .eq('id', item.variant_id);
      }
    }

    // 6. Recalculate remaining active items & order total
    const { data: allItems } = await (supabase as any)
      .from('order_items')
      .select('*')
      .eq('order_id', order_id);

    const activeItems = (allItems || []).filter((it: any) => it.status !== 'cancelled' && it.id !== item_id);
    const newTotal = Math.max(0, Number(order.total || 0) - refundAmountInINR);
    const newOrderStatus = activeItems.length === 0 ? 'cancelled' : 'partially_cancelled';
    const newPaymentStatus = activeItems.length === 0 ? 'refunded' : 'partially_refunded';

    await (supabase as any)
      .from('orders')
      .update({
        total: newTotal,
        status: newOrderStatus,
        payment_status: order.payment_method === 'razorpay' ? newPaymentStatus : order.payment_status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id);

    return NextResponse.json({
      success: true,
      message: razorpayRefundData
        ? `Item cancelled and ₹${refundAmountInINR} refunded to your payment source via Razorpay.`
        : `Item cancelled successfully and removed from order.`,
      refund_id: razorpayRefundData?.id || `ref_${Date.now()}`,
      new_total: newTotal,
      new_status: newOrderStatus,
    });
  } catch (err: any) {
    console.error('/api/payments/razorpay/refund exception:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
