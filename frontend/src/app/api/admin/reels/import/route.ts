import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { InstagramImportError, findOwnReel } from '@/lib/instagramImport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const fail = (status: number, code: string, error: string) => NextResponse.json({ code, error }, { status });

/** Download a file and store a copy in the public "media" bucket (Instagram's own links expire). */
async function copyToMedia(sourceUrl: string, folder: 'reels' | 'posters', ext: string, contentType: string, maxBytes = Infinity) {
  const res = await fetch(sourceUrl);
  if (!res.ok) return { url: null, tooBig: false };
  const body = await res.arrayBuffer();
  if (body.byteLength > maxBytes) return { url: null, tooBig: true };
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const storage = getServiceClient().storage.from('media');
  const { error } = await storage.upload(path, body, { contentType, cacheControl: '31536000' });
  if (error) {
    console.error('Reel import upload failed:', error);
    return { url: null, tooBig: false };
  }
  return { url: storage.getPublicUrl(path).data.publicUrl as string, tooBig: false };
}

/**
 * POST /api/admin/reels/import — Body: { link_url, caption? }
 * Finds one of our own reels through the Instagram API (INSTAGRAM_ACCESS_TOKEN), copies its video + cover
 * into storage and adds it as an autoplaying homepage reel.
 * Error codes: not_connected (no token), not_found (not on our account), instagram_error, too_big, upload_failed.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  if (!token) return fail(409, 'not_connected', 'Instagram is not connected yet — add INSTAGRAM_ACCESS_TOKEN to make link reels autoplay.');

  const body = await request.json().catch(() => ({}));
  const caption = typeof body?.caption === 'string' ? body.caption.trim().slice(0, 120) : '';

  let reel;
  try {
    reel = await findOwnReel(token, body?.link_url, undefined, process.env.INSTAGRAM_USER_ID);
  } catch (err) {
    if (err instanceof InstagramImportError) return fail(502, 'instagram_error', err.message);
    throw err;
  }
  if (!reel) return fail(404, 'not_found', 'This reel is not on your connected Instagram account.');

  const video = await copyToMedia(reel.videoUrl, 'reels', 'mp4', 'video/mp4', MAX_VIDEO_BYTES);
  if (video.tooBig) return fail(413, 'too_big', 'This reel is over 50 MB — upload a shorter version instead.');
  if (!video.url) return fail(502, 'upload_failed', 'Could not copy the reel video. Please try again.');
  const cover = reel.coverUrl ? await copyToMedia(reel.coverUrl, 'posters', 'jpg', 'image/jpeg') : { url: null };

  const supabase = getServiceClient();
  const { data: existing } = await supabase.from('home_reels').select('sort_order');
  const next = Math.max(0, ...(existing ?? []).map((r: { sort_order: number | null }) => Number(r.sort_order) || 0)) + 1;
  const { data, error } = await supabase
    .from('home_reels')
    .insert({ video_url: video.url, poster_url: cover.url, link_url: reel.link, caption: caption || null, sort_order: next, is_active: true })
    .select('*')
    .single();
  if (error) {
    console.error('POST /api/admin/reels/import insert failed:', error);
    return fail(500, 'upload_failed', 'Could not add the reel.');
  }
  return NextResponse.json({ reel: data });
}
