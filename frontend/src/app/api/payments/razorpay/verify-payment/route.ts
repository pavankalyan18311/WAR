import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { createShiprocketOrder } from '@/lib/shiprocket';
import { recordCouponUsage } from '@/lib/coupon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? '';
const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '';

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service role credentials not configured');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getOrCreateGuestUser(supabase: any, email?: string, name?: string) {
  let targetEmail = (email || '').trim().toLowerCase();
  if (!targetEmail || !targetEmail.includes('@')) {
    targetEmail = `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}@warbrand.com`;
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', targetEmail)
    .maybeSingle();

  if (existingProfile?.id) {
    return existingProfile.id;
  }

  try {
    const { data: newUser } = await supabase.auth.admin.createUser({
      email: targetEmail,
      email_confirm: true,
      user_metadata: { name: name || 'Guest Customer' },
    });

    if (newUser?.user?.id) {
      return newUser.user.id;
    }
  } catch (err) {
    console.warn('Guest account creation notice:', err);
  }

  const { data: firstProfile } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)
    .maybeSingle();

  return firstProfile?.id || null;
}

/**
 * POST /api/payments/razorpay/verify-payment
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderPayload,
      orderItems,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing required Razorpay verification parameters' }, { status: 400 });
    }

    if (!RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 });
    }

    // 1. Verify Razorpay HMAC Signature
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('Razorpay signature mismatch:', { expectedSignature, razorpay_signature });
      return NextResponse.json({ error: 'Payment signature verification failed' }, { status: 400 });
    }

    // 2. Fetch Exact Payment Details from Razorpay API
    const authHeader = 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

    let rzpMethod = 'card';
    let rzpDetails: any = {};

    try {
      const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
        headers: { Authorization: authHeader },
      });
      if (rzpRes.ok) {
        rzpDetails = await rzpRes.json();
        rzpMethod = rzpDetails.method || 'card';
      }
    } catch (e) {
      console.warn('Failed to fetch Razorpay payment info:', e);
    }

    // Determine PostgreSQL enum payment_method ('upi', 'net_banking', 'card', 'cod')
    let dbMethod: 'cod' | 'card' | 'upi' | 'net_banking' = 'card';
    const lowerMethod = (rzpMethod || '').toLowerCase();
    const walletName = (rzpDetails.wallet || '').toLowerCase();

    if (lowerMethod === 'upi' || rzpDetails.vpa || walletName.includes('mobikwik') || walletName.includes('upi') || lowerMethod === 'wallet') {
      dbMethod = 'upi';
    } else if (lowerMethod === 'netbanking' || lowerMethod.includes('bank')) {
      dbMethod = 'net_banking';
    } else if (lowerMethod === 'card') {
      dbMethod = 'card';
    }

    // 3. Signature Verified Successfully! Save order into Supabase
    if (orderPayload) {
      const supabase = getAdminClient();

      const rawAddress = typeof orderPayload.shipping_address === 'string'
        ? JSON.parse(orderPayload.shipping_address)
        : (orderPayload.shipping_address || {});

      const cleanShippingAddress = {
        full_name: rawAddress.full_name || '',
        phone: rawAddress.phone || '',
        address_line_1: rawAddress.address_line_1 || rawAddress.address_line1 || '',
        address_line_2: rawAddress.address_line_2 || rawAddress.address_line2 || '',
        city: rawAddress.city || '',
        state: rawAddress.state || '',
        pincode: rawAddress.pincode || '',
        country: rawAddress.country || 'India',
      };

      const paymentNotesObj = {
        gateway: 'Razorpay',
        razorpay_order_id,
        razorpay_payment_id,
        payment_method_detail: rzpMethod,
        wallet: rzpDetails.wallet || null,
        vpa: rzpDetails.vpa || null,
        bank: rzpDetails.bank || null,
      };

      // Resolve valid user_id (for guest buyers or logged-in users)
      let finalUserId = orderPayload.user_id;
      if (!finalUserId) {
        const guestEmail = rawAddress.email || orderPayload.email || '';
        finalUserId = await getOrCreateGuestUser(supabase, guestEmail, cleanShippingAddress.full_name);
      }

      const finalOrder = {
        id: orderPayload.id,
        user_id: finalUserId,
        status: 'confirmed',
        subtotal: Number(orderPayload.subtotal || 0),
        discount: Number(orderPayload.discount || 0),
        shipping: Number(orderPayload.shipping || 0),
        tax: Number(orderPayload.tax || 0),
        total: Number(orderPayload.total || 0),
        payment_method: dbMethod,
        payment_status: 'paid',
        shipping_address: cleanShippingAddress,
        notes: JSON.stringify(paymentNotesObj),
        coupon_code: orderPayload.coupon_code || null,
        created_at: new Date().toISOString(),
      };

      const { error: orderErr } = await (supabase as any)
        .from('orders')
        .insert(finalOrder);

      if (orderErr) {
        console.warn('Database order insert notice:', orderErr);
        const { error: updateErr } = await (supabase as any)
          .from('orders')
          .update({
            status: 'confirmed',
            payment_status: 'paid',
            payment_method: dbMethod,
            shipping_address: cleanShippingAddress,
            notes: JSON.stringify(paymentNotesObj),
          })
          .eq('id', finalOrder.id);

        if (updateErr) {
          console.error('Failed to insert or update order in Supabase:', updateErr);
          return NextResponse.json({ error: `Database save error: ${updateErr.message}` }, { status: 400 });
        }
      }

      if (orderItems && Array.isArray(orderItems) && orderItems.length > 0) {
        const formattedItems = orderItems.map((it: any) => ({
          id: it.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined),
          order_id: finalOrder.id,
          product_id: it.product_id,
          variant_id: it.variant_id,
          quantity: Number(it.quantity || 1),
          unit_price: Number(it.unit_price || 0),
          total_price: Number(it.total_price || (it.unit_price * it.quantity)),
        }));

        const { error: itemsErr } = await (supabase as any)
          .from('order_items')
          .insert(formattedItems);

        if (itemsErr) {
          console.error('Failed to insert order_items in Supabase:', itemsErr);
          return NextResponse.json({ error: `Failed to save order items: ${itemsErr.message}` }, { status: 400 });
        }
      }

      // 4. Record coupon usage if a coupon was applied
      if (finalOrder.coupon_code && finalUserId) {
        await recordCouponUsage(finalOrder.coupon_code, finalUserId, finalOrder.id);
      }

      // 5. Trigger Shiprocket shipment creation automatically for Razorpay orders!
      try {
        const shipItems = (orderItems || []).map((it: any) => ({
          name: 'WAR Apparel',
          sku: `SKU-${(it.variant_id || it.product_id || 'TEE').slice(0, 8)}`,
          units: Number(it.quantity || 1),
          selling_price: Number(it.unit_price || 0),
        }));

        const shipRes = await createShiprocketOrder({
          order_id: finalOrder.id,
          order_date: new Date().toISOString().replace('T', ' ').slice(0, 19),
          billing_customer_name: cleanShippingAddress.full_name || 'Customer',
          billing_address: cleanShippingAddress.address_line_1 || 'Address',
          billing_city: cleanShippingAddress.city || 'City',
          billing_pincode: cleanShippingAddress.pincode || '560057',
          billing_state: cleanShippingAddress.state || 'State',
          billing_country: cleanShippingAddress.country || 'India',
          billing_email: rawAddress.email || cleanShippingAddress.full_name?.toLowerCase().replace(/\s/g, '') + '@war.in',
          billing_phone: cleanShippingAddress.phone || '9988776655',
          shipping_is_billing: true,
          order_items: shipItems.length > 0 ? shipItems : [{ name: 'WAR Streetwear Tee', sku: 'WAR-TEE', units: 1, selling_price: Number(finalOrder.total) }],
          payment_method: 'Prepaid',
          sub_total: Number(finalOrder.subtotal || finalOrder.total),
        });

        if (shipRes.success && shipRes.awb_code) {
          await (supabase as any)
            .from('orders')
            .update({ tracking_number: shipRes.awb_code, status: 'confirmed' })
            .eq('id', finalOrder.id);
        }
      } catch (sErr) {
        console.warn('Shiprocket Razorpay order dispatch notice:', sErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and order confirmed successfully',
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
    });
  } catch (err: any) {
    console.error('Razorpay verify-payment exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
