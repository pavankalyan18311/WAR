import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createShiprocketOrder } from '@/lib/shiprocket';
import { recordCouponUsage } from '@/lib/coupon';

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

function normalizePaymentMethod(method: string | undefined): 'cod' | 'card' | 'upi' | 'net_banking' | 'loyalty_points' {
  if (!method) return 'cod';
  const lower = method.toLowerCase();
  if (lower === 'cod') return 'cod';
  if (lower === 'upi' || lower.includes('upi')) return 'upi';
  if (lower === 'net_banking' || lower.includes('netbank')) return 'net_banking';
  if (lower === 'loyalty_points' || lower.includes('loyalty')) return 'loyalty_points';
  return 'card';
}

/**
 * GET /api/orders?user_id=...&order_id=...
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const orderId = searchParams.get('order_id');

  if (!userId && !orderId) {
    return NextResponse.json({ error: 'user_id or order_id is required' }, { status: 400 });
  }

  try {
    const supabase = getAdminClient();

    const [{ data: colorsData }, { data: sizesData }] = await Promise.all([
      supabase.from('colors').select('*'),
      supabase.from('size_options').select('*'),
    ]);

    const colorsMap = new Map((colorsData || []).map((c: any) => [c.id, c.name]));
    const sizesMap = new Map((sizesData || []).map((s: any) => [s.id, s.name]));

    let query = supabase.from('orders').select(`
      *,
      order_items:order_items(
        *,
        product:products(name, slug),
        variant:product_variants(id, price, compare_at_price, sku, color_id, size_option_id)
      )
    `);

    if (orderId) {
      query = query.eq('id', orderId);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    query = query.order('created_at', { ascending: false });

    const { data: rawOrders, error } = await query;

    if (error) {
      console.warn('/api/orders GET join notice:', error.message);
      let fallbackQuery = supabase.from('orders').select('*');
      if (orderId) fallbackQuery = fallbackQuery.eq('id', orderId);
      else if (userId) fallbackQuery = fallbackQuery.eq('user_id', userId);
      fallbackQuery = fallbackQuery.order('created_at', { ascending: false });

      const { data: fallbackOrders } = await fallbackQuery;
      return NextResponse.json({ success: true, orders: fallbackOrders || [] });
    }

    if (!rawOrders) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const orders = rawOrders.map((ord: any) => {
      let parsedAddress = ord.shipping_address;
      if (typeof parsedAddress === 'string') {
        try { parsedAddress = JSON.parse(parsedAddress); } catch (e) {}
      }

      const normalizedItems = (ord.order_items || []).map((item: any) => {
        const colorName = colorsMap.get(item.variant?.color_id) || item.variant?.color || 'Default';
        const sizeName = sizesMap.get(item.variant?.size_option_id) || item.variant?.size || 'Free Size';

        return {
          ...item,
          product: item.product || { name: 'WAR Apparel', slug: 'war-apparel' },
          variant: {
            ...item.variant,
            size: sizeName,
            color: colorName,
          },
        };
      });

      return {
        ...ord,
        shipping_address: parsedAddress,
        order_items: normalizedItems,
      };
    });

    return NextResponse.json({ success: true, orders });
  } catch (err: any) {
    console.error('/api/orders GET exception:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

async function getOrCreateGuestUser(supabase: any, email?: string, name?: string) {
  let targetEmail = (email || '').trim().toLowerCase();
  if (!targetEmail || !targetEmail.includes('@')) {
    targetEmail = `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}@warbrand.com`;
  }

  // 1. Check if profile already exists in public.profiles by email
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', targetEmail)
    .maybeSingle();

  if (existingProfile?.id) {
    return existingProfile.id;
  }

  // 2. Auto-create guest user using Supabase Auth Admin SDK
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

  // 3. Fallback: return any valid profile ID
  const { data: firstProfile } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)
    .maybeSingle();

  return firstProfile?.id || null;
}

/**
 * POST /api/orders
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order, items } = body;

    if (!order || !order.id) {
      return NextResponse.json({ error: 'Invalid order payload' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const dbPaymentMethod = normalizePaymentMethod(order.payment_method);

    const rawAddress = order.shipping_address || {};
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

    // Resolve valid user_id (for guest buyers or logged-in users)
    let finalUserId = order.user_id;
    if (!finalUserId) {
      const guestEmail = rawAddress.email || order.email || '';
      finalUserId = await getOrCreateGuestUser(supabase, guestEmail, cleanShippingAddress.full_name);
    }

    // 1. Insert order record
    const { error: orderError } = await (supabase as any)
      .from('orders')
      .insert({
        id: order.id,
        user_id: finalUserId,
        status: order.status || 'confirmed',
        subtotal: Number(order.subtotal || 0),
        discount: Number(order.discount || 0),
        shipping: Number(order.shipping || 0),
        tax: Number(order.tax || 0),
        total: Number(order.total || 0),
        payment_method: dbPaymentMethod,
        payment_status: order.payment_status || 'pending',
        shipping_address: cleanShippingAddress,
        notes: typeof order.notes === 'string' ? order.notes : (order.notes ? JSON.stringify(order.notes) : null),
        coupon_code: order.coupon_code || null,
      });

    if (orderError) {
      console.error('/api/orders POST orderError:', orderError);
      return NextResponse.json({ error: orderError.message }, { status: 400 });
    }

    // 2. Insert order_items records if any
    if (items && Array.isArray(items) && items.length > 0) {
      const formattedItems = items.map((it: any) => ({
        id: it.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined),
        order_id: order.id,
        product_id: it.product_id,
        variant_id: it.variant_id,
        quantity: Number(it.quantity || 1),
        unit_price: Number(it.unit_price || 0),
        total_price: Number(it.total_price || (it.unit_price * it.quantity)),
      }));

      const { error: itemsError } = await (supabase as any)
        .from('order_items')
        .insert(formattedItems);

      if (itemsError) {
        console.error('/api/orders POST itemsError:', itemsError);
        return NextResponse.json({ error: `Failed to save order items: ${itemsError.message}` }, { status: 400 });
      }
    }

    // 3. Record coupon usage if applied
    if (order.coupon_code && finalUserId) {
      await recordCouponUsage(order.coupon_code, finalUserId, order.id);
    }

    // 4. Trigger Shiprocket shipment creation automatically
    try {
      const shipItems = (items || []).map((it: any) => ({
        name: 'WAR Apparel',
        sku: `SKU-${(it.variant_id || it.product_id || 'TEE').slice(0, 8)}`,
        units: Number(it.quantity || 1),
        selling_price: Number(it.unit_price || 0),
      }));

      const shipRes = await createShiprocketOrder({
        order_id: order.id,
        order_date: new Date().toISOString().replace('T', ' ').slice(0, 19),
        billing_customer_name: cleanShippingAddress.full_name || 'Customer',
        billing_address: cleanShippingAddress.address_line_1 || 'Address',
        billing_city: cleanShippingAddress.city || 'City',
        billing_pincode: cleanShippingAddress.pincode || '560057',
        billing_state: cleanShippingAddress.state || 'State',
        billing_country: cleanShippingAddress.country || 'India',
        billing_email: 'customer@war.com',
        billing_phone: cleanShippingAddress.phone || '9988776655',
        shipping_is_billing: true,
        order_items: shipItems.length > 0 ? shipItems : [{ name: 'WAR Streetwear Tee', sku: 'WAR-TEE', units: 1, selling_price: Number(order.total) }],
        payment_method: dbPaymentMethod === 'cod' ? 'COD' : 'Prepaid',
        sub_total: Number(order.subtotal || order.total),
      });

      if (shipRes.success && shipRes.awb_code) {
        await (supabase as any)
          .from('orders')
          .update({ tracking_number: shipRes.awb_code, status: 'confirmed' })
          .eq('id', order.id);
      }
    } catch (sErr) {
      console.warn('Shiprocket dispatch notice:', sErr);
    }

    return NextResponse.json({ success: true, order_id: order.id });
  } catch (err: any) {
    console.error('/api/orders POST exception:', err);
    return NextResponse.json({ error: err.message || 'Failed to place order' }, { status: 500 });
  }
}
