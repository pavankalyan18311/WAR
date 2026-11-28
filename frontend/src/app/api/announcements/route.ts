import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { DEFAULT_ANNOUNCEMENTS, announcementsFrom } from '@/lib/homeContent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/announcements — the black announcement bar's messages (public; edited in Admin → Homepage). */
export async function GET() {
  const { data, error } = await getServiceClient().from('store_settings').select('home_announcements').eq('id', 1).maybeSingle();
  const body = error ? DEFAULT_ANNOUNCEMENTS : announcementsFrom(data?.home_announcements);
  return NextResponse.json(body, { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300' } });
}
