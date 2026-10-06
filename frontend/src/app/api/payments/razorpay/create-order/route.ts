import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? '';

/**
 * POST /api/payments/razorpay/create-order
 * Body: { amount: number (in INR), receiptId?: string, notes?: object }
 */
export async function POST(request: Request) {
  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { amount, receiptId, notes } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount in INR is required' }, { status: 400 });
    }

    const amountInPaise = Math.round(amount * 100);
    const receipt = receiptId || `rcpt_${Date.now()}`;

    const authHeader = `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`;

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        notes: notes || {},
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      console.error('Razorpay Order Creation Error:', data);
      return NextResponse.json({ error: data.error?.description || 'Failed to create Razorpay order' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      order_id: data.id,
      amount: data.amount,
      currency: data.currency,
      key_id: RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    console.error('Razorpay create-order exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
