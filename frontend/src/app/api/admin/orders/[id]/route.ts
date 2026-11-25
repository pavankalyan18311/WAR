import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { awardPointsOnDelivery } from '@/lib/rewards';
import { sendOrderEmail } from '@/lib/email/orderEmails';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Fulfilment steps an admin may set directly. Cancelling goes through /cancel so money and stock are handled. */
const FULFILMENT_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered'];

/** PATCH /api/admin/orders/[id] — Body: { status?, tracking_number? } (admin only). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { status, tracking_number } = await request.json();
  const patch: Record<string, string | null> = { updated_at: new Date().toISOString() };
  if (status !== undefined) {
    if (!FULFILMENT_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Use "Cancel order" to cancel — it refunds and restocks automatically.' }, { status: 400 });
    }
    patch.status = status;
  }
  if (tracking_number !== undefined) patch.tracking_number = String(tracking_number).trim() || null;

  const { id } = await params;
  const supabase = getServiceClient();
  const { error } = await supabase.from('orders').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not update the order.' }, { status: 500 });

  if (status === 'delivered') {
    await awardPointsOnDelivery(supabase, id); // once per order; never throws
    await sendOrderEmail(supabase, id, { kind: 'order_delivered' }); // sent once per order
  }
  return NextResponse.json({ success: true });
}
