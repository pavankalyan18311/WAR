import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createShiprocketOrder } from '@/lib/shiprocket';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_ANON_KEY;

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * POST /api/shipping/create-order
 * Body: { order_id: string }
 * Fetches order from PostgreSQL, creates shipment in Shiprocket, and updates tracking_number in DB.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Fetch order from Supabase
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          product:products(name, sku),
          variant:product_variants(sku)
        )
      `)
      .eq('id', order_id)
      .maybeSingle();

    if (orderErr || !order) {
      console.error('/api/shipping/create-order fetch error:', orderErr);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const addr = order.shipping_address || {};
    const items = (order.order_items || []).map((it: any) => ({
      name: it.product?.name || 'WAR Apparel',
      sku: it.variant?.sku || it.product?.sku || `SKU-${it.product_id?.slice(0, 6)}`,
      units: Number(it.quantity || 1),
      selling_price: Number(it.unit_price || 0),
    }));

    // 2. Construct Shiprocket payload
    const isCod = (order.payment_method || '').toLowerCase() === 'cod';
    const payload = {
      order_id: order.id,
      order_date: new Date(order.created_at || Date.now()).toISOString().replace('T', ' ').slice(0, 19),
      billing_customer_name: addr.full_name || 'Customer',
      billing_address: addr.address_line_1 || 'Address Line 1',
      billing_city: addr.city || 'Bangalore',
      billing_pincode: addr.pincode || '560057',
      billing_state: addr.state || 'Karnataka',
      billing_country: addr.country || 'India',
      billing_email: order.user_id ? `${order.user_id.slice(0, 8)}@user.com` : 'customer@war.com',
      billing_phone: addr.phone || '9988776655',
      shipping_is_billing: true,
      order_items: items.length > 0 ? items : [{ name: 'Oversized Streetwear Tee', sku: 'WAR-TEE', units: 1, selling_price: Number(order.total) }],
      payment_method: (isCod ? 'COD' : 'Prepaid') as 'COD' | 'Prepaid',
      sub_total: Number(order.subtotal || order.total),
      length: 30,
      breadth: 25,
      height: 5,
      weight: 0.5,
    };

    // 3. Create Shiprocket Shipment
    const shipResult = await createShiprocketOrder(payload);

    if (!shipResult.success || !shipResult.awb_code) {
      console.error('/api/shipping/create-order Shiprocket error:', shipResult.error);
      return NextResponse.json({ error: shipResult.error || 'Shipment creation failed' }, { status: 400 });
    }

    // 4. Update order tracking_number in Supabase PostgreSQL
    const { error: updateErr } = await (supabase as any)
      .from('orders')
      .update({
        tracking_number: shipResult.awb_code,
        status: 'shipped',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateErr) {
      console.error('/api/shipping/create-order DB update error:', updateErr);
    }

    return NextResponse.json({
      success: true,
      tracking_number: shipResult.awb_code,
      courier_name: shipResult.courier_name,
      status: 'shipped',
    });
  } catch (err: any) {
    console.error('/api/shipping/create-order exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
