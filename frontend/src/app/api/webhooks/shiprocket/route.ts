import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
 * Shiprocket Webhook Event Status Map to PostgreSQL Order Status
 */
const SHIPROCKET_STATUS_MAP: Record<string, string> = {
  NEW: 'confirmed',
  PICKUP_SCHEDULED: 'processing',
  PICKED_UP: 'shipped',
  IN_TRANSIT: 'shipped',
  OUT_FOR_DELIVERY: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RTO_INITIATED: 'cancelled',
  RTO_DELIVERED: 'refunded',
};

/**
 * POST /api/webhooks/shiprocket
 * Receives automated real-time status updates from Shiprocket courier engine.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { order_id, awb, current_status, tracking_data } = body;

    console.log('[Shiprocket Webhook Received]:', { order_id, awb, current_status });

    if (!order_id && !awb) {
      return NextResponse.json({ error: 'order_id or awb is required' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const rawStatus = String(current_status || '').toUpperCase().trim();
    const dbStatus = SHIPROCKET_STATUS_MAP[rawStatus] || 'shipped';

    // Update orders table in Supabase PostgreSQL
    let query = (supabase as any).from('orders').update({
      status: dbStatus,
      tracking_number: awb || undefined,
      updated_at: new Date().toISOString(),
    });

    if (order_id) {
      query = query.eq('id', order_id);
    } else if (awb) {
      query = query.eq('tracking_number', awb);
    }

    const { error: updateErr } = await query;
    if (updateErr) {
      console.error('[Shiprocket Webhook DB Update Error]:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${dbStatus}`,
      order_id,
      awb,
    });
  } catch (err: any) {
    console.error('[Shiprocket Webhook Exception]:', err);
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 500 });
  }
}
