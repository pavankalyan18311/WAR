import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/apiAuth';
import { CheckoutError, priceOrder, supabasePricingDeps } from '@/lib/checkout/priceOrder';
import { validateShippingAddress } from '@/lib/checkout/address';
import { afterOrderConfirmed, releaseStock, reserveStock } from '@/lib/checkout/fulfil';
import { redeemPoints } from '@/lib/rewards';
import { getPublicStorageUrl } from '@/lib/supabase/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as any;
}

const ORDER_SELECT = `
  *,
  order_items:order_items(
    *,
    product:products(name, slug, product_media(storage_path, sort_order)),
    variant:product_variants(id, sku, color:colors(name), size_option:size_options(name))
  )
`;

function normalizeOrder(ord: any) {
  return {
    ...ord,
    order_items: (ord.order_items ?? []).map((item: any) => ({
      ...item,
      product: item.product && {
        ...item.product,
        // First photo (by sort order) for order thumbnails
        images: [...(item.product.product_media ?? [])]
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .slice(0, 1)
          .map((m: any) => ({ url: getPublicStorageUrl(m.storage_path) })),
      },
      variant: {
        ...item.variant,
        color: item.variant?.color?.name ?? null,
        size: item.variant?.size_option?.name ?? null,
      },
    })),
  };
}

/**
 * GET /api/orders            → the signed-in user's orders
 * GET /api/orders?order_id=  → full order for its owner; status-only tracking for anyone else
 * GET /api/orders?ref=WAR-…  /  ?awb=<courier tracking number> → the signed-in user's own order
 */
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const params = new URL(request.url).searchParams;
  const orderId = params.get('order_id');
  const ref = params.get('ref');
  const awb = params.get('awb')?.replace(/\s+/g, '');
  const supabase = getAdminClient();

  if (awb) {
    // Courier tracking number (AWB) — own orders only.
    if (!/^[A-Za-z0-9-]{4,40}$/.test(awb)) return NextResponse.json({ error: 'Invalid tracking number.' }, { status: 400 });
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('user_id', auth.user.id)
      .eq('tracking_number', awb);
    if (error) return NextResponse.json({ error: 'Could not load order.' }, { status: 500 });
    return NextResponse.json({ success: true, orders: (data ?? []).map(normalizeOrder) });
  }

  if (ref) {
    // Short reference "WAR-ABCDEF12" = first 8 hex chars of the order UUID. Own orders only.
    const match = /^WAR-([0-9a-f]{8})$/i.exec(ref.trim());
    if (!match) return NextResponse.json({ error: 'Invalid order reference.' }, { status: 400 });
    const prefix = match[1].toLowerCase();
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('user_id', auth.user.id)
      .gte('id', `${prefix}-0000-0000-0000-000000000000`)
      .lte('id', `${prefix}-ffff-ffff-ffff-ffffffffffff`);
    if (error) return NextResponse.json({ error: 'Could not load order.' }, { status: 500 });
    return NextResponse.json({ success: true, orders: (data ?? []).map(normalizeOrder) });
  }

  if (orderId) {
    const { data, error } = await supabase.from('orders').select(ORDER_SELECT).eq('id', orderId);
    if (error) return NextResponse.json({ error: 'Could not load order.' }, { status: 500 });
    const order = data?.[0];
    if (!order) return NextResponse.json({ success: true, orders: [] });
    if (order.user_id !== auth.user.id) {
      const { id, status, tracking_number, created_at, updated_at } = order;
      return NextResponse.json({ success: true, orders: [{ id, status, tracking_number, created_at, updated_at }] });
    }
    return NextResponse.json({ success: true, orders: [normalizeOrder(order)] });
  }

  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Could not load orders.' }, { status: 500 });
  return NextResponse.json({ success: true, orders: (data ?? []).map(normalizeOrder) });
}

/**
 * POST /api/orders — places a Cash on Delivery order (or one fully paid with reward points).
 * Body: { items: [{ variant_id, quantity }], coupon_code?, points_to_use?, shipping_address }
 * Prices, stock and coupon are all checked on the server.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

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
    const paidByPoints = pointsUsed > 0 && priced.totals.total === 0;
    if (!paidByPoints && !priced.settings.cod_enabled) {
      throw new CheckoutError('Cash on Delivery is not available right now. Please pay online.');
    }

    if (!(await reserveStock(supabase, priced.lines))) {
      return NextResponse.json(
        { error: 'Some items just sold out. Please review your cart.' },
        { status: 409 },
      );
    }

    const orderId = crypto.randomUUID();
    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      user_id: auth.user.id,
      status: 'confirmed',
      payment_method: paidByPoints ? 'points' : 'cod',
      payment_status: paidByPoints ? 'paid' : 'pending',
      ...priced.totals,
      ...(pointsUsed > 0 ? { points_used: pointsUsed } : {}),
      coupon_code: priced.couponCode,
      shipping_address: address,
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
      console.error('/api/orders POST save error:', orderError ?? itemsError);
      if (!orderError) await supabase.from('orders').delete().eq('id', orderId);
      await releaseStock(supabase, priced.lines);
      return NextResponse.json({ error: 'Could not place your order. Please try again.' }, { status: 500 });
    }

    // Spend the points (atomic). If they were used elsewhere meanwhile, undo the order.
    if (pointsUsed > 0 && !(await redeemPoints(supabase, auth.user.id, orderId, pointsUsed))) {
      await supabase.from('order_items').delete().eq('order_id', orderId);
      await supabase.from('orders').delete().eq('id', orderId);
      await releaseStock(supabase, priced.lines);
      return NextResponse.json({ error: 'Your reward points balance changed. Please review your order.' }, { status: 409 });
    }

    try {
      await afterOrderConfirmed(supabase, {
        id: orderId,
        userId: auth.user.id,
        couponCode: priced.couponCode,
        customerEmail: auth.user.email ?? '',
      });
    } catch (err) {
      console.error('/api/orders post-confirmation step failed (order is saved):', err);
    }

    return NextResponse.json({ success: true, order_id: orderId, totals: priced.totals, points_used: pointsUsed });
  } catch (err) {
    if (err instanceof CheckoutError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error('/api/orders POST exception:', err);
    return NextResponse.json({ error: 'Could not place your order. Please try again.' }, { status: 500 });
  }
}
