import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOrderEmail } from '@/lib/email/orderEmails';
import { awardPointsOnDelivery } from '@/lib/rewards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as any;
}

/** Shiprocket shipment status → our order status. Unknown statuses leave the order status unchanged. */
const SHIPROCKET_STATUS_MAP: Record<string, string> = {
  NEW: 'confirmed',
  PICKUP_SCHEDULED: 'processing',
  PICKED_UP: 'shipped',
  IN_TRANSIT: 'shipped',
  OUT_FOR_DELIVERY: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RTO_INITIATED: 'cancelled',
  RTO_DELIVERED: 'cancelled',
};

/** The token you set in Shiprocket → Settings → Webhooks is sent in the x-api-key header. */
function hasValidToken(request: Request): boolean {
  const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN ?? '';
  const given = request.headers.get('x-api-key') ?? '';
  if (!expected || given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/** POST /api/webhooks/shiprocket — shipment status updates from Shiprocket. */
export async function POST(request: Request) {
  if (!hasValidToken(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { order_id, awb, current_status, courier_name } = await request.json();
    if (!order_id && !awb) {
      return NextResponse.json({ error: 'order_id or awb is required' }, { status: 400 });
    }

    const status = SHIPROCKET_STATUS_MAP[String(current_status ?? '').toUpperCase().trim()];
    const patch: Record<string, string> = { updated_at: new Date().toISOString() };
    if (status) patch.status = status;
    if (awb) patch.tracking_number = String(awb);
    if (courier_name) patch.courier_name = String(courier_name);

    const supabase = getAdminClient();
    const query = supabase.from('orders').update(patch);
    const { data: updated, error } = await (order_id ? query.eq('id', order_id) : query.eq('tracking_number', awb)).select('id');
    if (error) {
      console.error('[Shiprocket webhook] DB update error:', error);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
    if (status === 'delivered') {
      for (const row of updated ?? []) {
        await awardPointsOnDelivery(supabase, row.id); // before the email, so it can mention the points
        await sendOrderEmail(supabase, row.id, { kind: 'order_delivered' });
      }
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Shiprocket webhook] exception:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
