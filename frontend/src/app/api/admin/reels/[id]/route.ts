import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { HomeContentError, parseInstagramUrl } from '@/lib/homeContent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/admin/reels/[id] — Body: { is_active?, sort_order?, caption?, link_url? } */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  if ('is_active' in body) patch.is_active = !!body.is_active;
  if ('sort_order' in body && Number.isInteger(body.sort_order)) patch.sort_order = body.sort_order;
  if ('caption' in body) patch.caption = typeof body.caption === 'string' && body.caption.trim() ? body.caption.trim().slice(0, 120) : null;
  try {
    if ('link_url' in body) patch.link_url = parseInstagramUrl(body.link_url);
  } catch (err) {
    if (err instanceof HomeContentError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  const { error } = await getServiceClient().from('home_reels').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not update the reel.' }, { status: 500 });
  return NextResponse.json({ success: true });
}

/** DELETE /api/admin/reels/[id] — also removes the uploaded video/poster from storage. */
export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const supabase = getServiceClient();

  const { data: reel } = await supabase.from('home_reels').select('video_url, poster_url').eq('id', id).maybeSingle();
  const { error } = await supabase.from('home_reels').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not delete the reel.' }, { status: 500 });

  // Files we stored ourselves live under …/public/media/<path>
  const paths = [reel?.video_url, reel?.poster_url]
    .map((u: string | null | undefined) => u?.split('/storage/v1/object/public/media/')[1])
    .filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from('media').remove(paths);
  return NextResponse.json({ success: true });
}
