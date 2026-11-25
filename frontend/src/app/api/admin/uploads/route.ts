import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };

/** POST /api/admin/uploads — multipart "file" → stored in the "products" bucket; returns its public URL. */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const file = (await request.formData()).get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'No file received.' }, { status: 400 });
  const ext = EXT[file.type];
  if (!ext) return NextResponse.json({ error: 'Please upload a JPG, PNG, WEBP or AVIF image.' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Images must be 5 MB or smaller.' }, { status: 400 });

  const path = `products/${crypto.randomUUID()}.${ext}`;
  const storage = getServiceClient().storage.from('products');
  const { error } = await storage.upload(path, file, { contentType: file.type, cacheControl: '31536000' });
  if (error) {
    console.error('Image upload failed:', error);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ url: storage.getPublicUrl(path).data.publicUrl });
}
