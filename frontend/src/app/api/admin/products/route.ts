import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { parseProductInput, saveProduct, toAdminProductRow } from '@/lib/admin/products';
import { getServiceClient, productErrorResponse } from '@/lib/admin/routeHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/products — every product (any status) with real stock and units sold (admin only). */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const supabase = getServiceClient();
  const [{ data, error }, { data: sales }] = await Promise.all([
    supabase
      .from('products')
      .select(`id, name, slug, status, created_at,
        product_categories(category:categories(name)),
        product_media(storage_path, sort_order),
        product_variants(status, price, compare_at_price, inventory(quantity))`)
      .order('created_at', { ascending: false }),
    supabase.rpc('best_selling_product_ids', { p_limit: 10000 }),
  ]);
  if (error) {
    console.error('/api/admin/products GET error:', error);
    return NextResponse.json({ error: 'Could not load products.' }, { status: 500 });
  }

  const salesByProduct = new Map<string, number>((sales ?? []).map((s: any) => [s.product_id, Number(s.units)]));
  return NextResponse.json({ products: (data ?? []).map((p: any) => toAdminProductRow(p, salesByProduct)) });
}

/** POST /api/admin/products — create a product (admin only). */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const input = parseProductInput(await request.json());
    const id = await saveProduct(getServiceClient(), input);
    return NextResponse.json({ success: true, id });
  } catch (err) {
    return productErrorResponse(err, 'save');
  }
}
