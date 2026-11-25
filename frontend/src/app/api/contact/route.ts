import { NextResponse } from 'next/server';
import { createClient as createSessionClient } from '@/lib/supabase/server';
import { getServiceClient } from '@/lib/admin/routeHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** POST /api/contact — Body: { name, email, phone?, order_ref?, subject?, message }. Saved for Admin → Messages. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  // Honeypot: real visitors never see or fill the "website" field.
  if (body.website) return NextResponse.json({ success: true });

  const name = s(body.name, 100);
  const email = s(body.email, 200).toLowerCase();
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!name) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
  if (!EMAIL.test(email)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  if (message.length < 10 || message.length > 5000) {
    return NextResponse.json({ error: 'Please write a message between 10 and 5000 characters.' }, { status: 400 });
  }

  const { data } = await (await createSessionClient()).auth.getUser();
  const { error } = await getServiceClient().from('contact_messages').insert({
    user_id: data.user?.id ?? null,
    name,
    email,
    phone: s(body.phone, 20) || null,
    order_ref: s(body.order_ref, 40) || null,
    message: s(body.subject, 30) ? `[${s(body.subject, 30)}] ${message}` : message,
  });
  if (error) {
    console.error('/api/contact insert error:', error);
    return NextResponse.json({ error: 'Could not send your message. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
