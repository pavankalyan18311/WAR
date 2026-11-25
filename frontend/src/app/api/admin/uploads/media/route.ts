import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 50 * 1024 * 1024;
const EXT: Record<string, string> = {
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
};

/**
 * POST /api/admin/uploads/media — Body: { content_type, size }
 * Returns a one-time signed upload link so the browser uploads the video straight to storage
 * (hosting providers limit request bodies to a few MB, so big videos can't pass through our server).
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { content_type, size } = await request.json().catch(() => ({}));
  const ext = EXT[content_type];
  if (!ext) return NextResponse.json({ error: 'Upload an MP4, WEBM or MOV video (or a JPG/PNG/WEBP image).' }, { status: 400 });
  if (!(Number(size) > 0) || Number(size) > MAX_BYTES) return NextResponse.json({ error: 'Files must be 50 MB or smaller.' }, { status: 400 });

  const folder = content_type.startsWith('video/') ? 'reels' : 'posters';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const storage = getServiceClient().storage.from('media');
  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error || !data) {
    console.error('createSignedUploadUrl failed:', error);
    return NextResponse.json({ error: 'Could not start the upload. Have you run the latest database migration?' }, { status: 500 });
  }
  return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl, publicUrl: storage.getPublicUrl(path).data.publicUrl });
}
