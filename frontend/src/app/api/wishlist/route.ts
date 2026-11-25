import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The signed-in customer's saved product ids. Rows are always scoped to the session user. */
async function savedIds(supabase: any, userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('wishlist').select('product_id').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.product_id);
}

/** GET /api/wishlist → { product_ids } */
export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  try {
    return NextResponse.json({ product_ids: await savedIds(getServiceClient(), auth.user.id) });
  } catch (err) {
    console.error('GET /api/wishlist failed:', err);
    return NextResponse.json({ error: 'Could not load your wishlist.' }, { status: 500 });
  }
}

/** POST /api/wishlist — Body: { product_ids: string[] } adds them (already-saved ones are ignored). */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const { product_ids } = await request.json().catch(() => ({}));
  const ids = Array.isArray(product_ids) ? [...new Set(product_ids.filter((x: unknown) => typeof x === 'string' && x))] : null;
  if (!ids || ids.length === 0 || ids.length > 200) {
    return NextResponse.json({ error: 'product_ids must be a list of product ids.' }, { status: 400 });
  }

  try {
    const supabase = getServiceClient();
    const { error } = await supabase.from('wishlist').upsert(
      ids.map((product_id) => ({ user_id: auth.user.id, product_id })),
      { onConflict: 'user_id,product_id', ignoreDuplicates: true },
    );
    if (error) throw error;
    return NextResponse.json({ product_ids: await savedIds(supabase, auth.user.id) });
  } catch (err) {
    console.error('POST /api/wishlist failed:', err);
    return NextResponse.json({ error: 'Could not save to your wishlist.' }, { status: 500 });
  }
}

/** DELETE /api/wishlist?product_id=… */
export async function DELETE(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const productId = new URL(request.url).searchParams.get('product_id');
  if (!productId) return NextResponse.json({ error: 'product_id is required.' }, { status: 400 });

  const { error } = await getServiceClient().from('wishlist').delete().eq('user_id', auth.user.id).eq('product_id', productId);
  if (error) {
    console.error('DELETE /api/wishlist failed:', error);
    return NextResponse.json({ error: 'Could not remove from your wishlist.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
