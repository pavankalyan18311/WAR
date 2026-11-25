import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { addToMarketingList } from '@/lib/email/marketing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/newsletter — Body: { email }. Subscribing twice is fine. */
export async function POST(request: Request) {
  const { email: raw } = await request.json().catch(() => ({}));
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const { error } = await getServiceClient()
    .from('newsletter_subscribers')
    .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true });
  if (error) {
    console.error('/api/newsletter error:', error);
    return NextResponse.json({ error: 'Could not subscribe right now. Please try again.' }, { status: 500 });
  }
  await addToMarketingList(email);
  return NextResponse.json({ success: true });
}
