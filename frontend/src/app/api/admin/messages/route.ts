import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/messages — contact form messages, newest first (admin only). */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { data, error } = await getServiceClient()
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Could not load messages. Has the database migration been run?' }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

/** PATCH /api/admin/messages — Body: { id, status: 'new' | 'handled' } (admin only). */
export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id, status } = await request.json();
  if (!id || !['new', 'handled'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const { error } = await getServiceClient().from('contact_messages').update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not update message.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
