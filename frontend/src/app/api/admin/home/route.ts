import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { HomeContentError, loadHomeContent, parseAnnouncementsInput, parseInstagramUrl, parseMarqueeInput } from '@/lib/homeContent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/home — announcement bar, scrolling banner + Instagram link (admin only). */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { marquee, announcements, instagramUrl } = await loadHomeContent(getServiceClient());
  return NextResponse.json({ marquee, announcements, instagram_url: instagramUrl ?? '' });
}

/** PUT /api/admin/home — Body: { marquee?, announcements?, instagram_url? } */
export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  try {
    if ('marquee' in body) patch.home_marquee = parseMarqueeInput(body.marquee);
    if ('announcements' in body) patch.home_announcements = parseAnnouncementsInput(body.announcements);
    if ('instagram_url' in body) patch.instagram_url = parseInstagramUrl(body.instagram_url);
  } catch (err) {
    if (err instanceof HomeContentError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  const { error } = await getServiceClient().from('store_settings').update(patch).eq('id', 1);
  if (error) {
    console.error('PUT /api/admin/home failed:', error);
    return NextResponse.json({ error: 'Could not save. Have you run the latest database migration?' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
