import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { HomeContentError, parseReelInput } from '@/lib/homeContent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/reels — all homepage reels in display order (admin only). */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { data, error } = await getServiceClient().from('home_reels').select('*').order('sort_order').order('created_at');
  if (error) return NextResponse.json({ error: 'Could not load reels. Have you run the latest database migration?' }, { status: 500 });
  return NextResponse.json({ reels: data ?? [] });
}

/** POST /api/admin/reels — Body: { video_url, poster_url?, link_url?, caption? }; added at the end. */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  let input;
  try {
    input = parseReelInput(await request.json().catch(() => ({})));
  } catch (err) {
    if (err instanceof HomeContentError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }

  const supabase = getServiceClient();
  const { data: existing } = await supabase.from('home_reels').select('sort_order');
  const next = Math.max(0, ...(existing ?? []).map((r: any) => Number(r.sort_order) || 0)) + 1;
  const { data, error } = await supabase.from('home_reels').insert({ ...input, sort_order: next, is_active: true }).select('*').single();
  if (error) {
    console.error('POST /api/admin/reels failed:', error);
    return NextResponse.json({ error: 'Could not add the reel.' }, { status: 500 });
  }
  return NextResponse.json({ reel: data });
}
