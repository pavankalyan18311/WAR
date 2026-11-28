import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { RackHeroError, parseRackLink, parseRackName, parseRackPhoto, parseRackPrice } from '@/lib/rackHero';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const BUCKET_PATH = '/storage/v1/object/public/products/';

/** PATCH /api/admin/rack/[id] — Body: any of { name, price, front_url, back_url, link_url, is_active, sort_order, is_featured } */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  try {
    if ('name' in body) patch.name = parseRackName(body.name);
    if ('price' in body) patch.price = parseRackPrice(body.price);
    if ('front_url' in body) patch.front_url = parseRackPhoto(body.front_url, 'front', true);
    if ('back_url' in body) patch.back_url = parseRackPhoto(body.back_url, 'back', false);
    if ('link_url' in body) patch.link_url = parseRackLink(body.link_url);
  } catch (err) {
    if (err instanceof RackHeroError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
  if ('is_active' in body) patch.is_active = !!body.is_active;
  if ('sort_order' in body && Number.isInteger(body.sort_order)) patch.sort_order = body.sort_order;
  if (body.is_featured === true) patch.is_featured = true;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  const supabase = getServiceClient();
  // Only one tee faces forward first.
  if (patch.is_featured) await supabase.from('home_rack_tees').update({ is_featured: false }).neq('id', id);
  const { error } = await supabase.from('home_rack_tees').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not update the tee.' }, { status: 500 });
  return NextResponse.json({ success: true });
}

/** DELETE /api/admin/rack/[id] — also removes photos it uploaded to storage (built-in /images/ photos stay). */
export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const supabase = getServiceClient();

  const { data: tee } = await supabase.from('home_rack_tees').select('front_url, back_url').eq('id', id).maybeSingle();
  const { error } = await supabase.from('home_rack_tees').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not delete the tee.' }, { status: 500 });

  const paths = [tee?.front_url, tee?.back_url]
    .map((u: string | null | undefined) => u?.split(BUCKET_PATH)[1])
    .filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from('products').remove(paths);
  return NextResponse.json({ success: true });
}
