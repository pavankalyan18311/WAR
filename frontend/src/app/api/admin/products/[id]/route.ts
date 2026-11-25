import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { parseProductInput, saveProduct } from '@/lib/admin/products';
import { getServiceClient, productErrorResponse } from '@/lib/admin/routeHelpers';
import { getPublicStorageUrl } from '@/lib/supabase/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/products/[id] — the product as the edit form needs it (admin only). */
export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await params;
  const { data: p, error } = await getServiceClient()
    .from('products')
    .select(`*,
      product_categories(category_id),
      product_collections(collection_id),
      product_media(storage_path, sort_order),
      product_variants(id, color_id, size_option_id, price, compare_at_price, status, inventory(quantity))`)
    .eq('id', id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not load product.' }, { status: 500 });
  if (!p) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });

  return NextResponse.json({
    product: {
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      fabric: p.fabric ?? '',
      fit: p.fit ?? '',
      pattern: p.pattern ?? '',
      sleeve_type: p.sleeve_type ?? '',
      neck_type: p.neck_type ?? '',
      gender: p.gender ?? '',
      status: p.status === 'active' ? 'active' : 'draft',
      size_chart_id: p.size_chart_id ?? '',
      category_ids: (p.product_categories ?? []).map((c: any) => c.category_id),
      collection_ids: (p.product_collections ?? []).map((c: any) => c.collection_id),
      images: [...(p.product_media ?? [])]
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((m: any) => getPublicStorageUrl(m.storage_path))
        .filter(Boolean),
      variants: (p.product_variants ?? [])
        .filter((v: any) => v.status === 'active')
        .map((v: any) => {
          const inv = Array.isArray(v.inventory) ? v.inventory[0] : v.inventory;
          return {
            color_id: v.color_id,
            size_option_id: v.size_option_id,
            price: Number(v.price),
            compare_at_price: v.compare_at_price === null ? null : Number(v.compare_at_price),
            stock: Number(inv?.quantity ?? 0),
          };
        }),
    },
  });
}

/** PATCH /api/admin/products/[id] — change status: active, draft or archived (admin only). */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { status } = await request.json();
  if (!['active', 'draft', 'archived'].includes(status)) {
    return NextResponse.json({ error: 'Status must be active, draft or archived.' }, { status: 400 });
  }
  const { id } = await params;
  const { error } = await getServiceClient()
    .from('products')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not update status.' }, { status: 500 });
  return NextResponse.json({ success: true });
}

/** PUT /api/admin/products/[id] — update a product (admin only). */
export async function PUT(request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const input = parseProductInput(await request.json());
    await saveProduct(getServiceClient(), input, id);
    return NextResponse.json({ success: true, id });
  } catch (err) {
    return productErrorResponse(err, 'update');
  }
}
