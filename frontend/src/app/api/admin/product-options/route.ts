import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { emptyOptions, isProductAttribute, tidyOption } from '@/lib/admin/productOptions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/admin/product-options — dropdown options grouped by attribute (admin only). */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { data, error } = await getServiceClient()
    .from('product_attribute_options')
    .select('id, attribute, value, sort_order')
    .order('sort_order')
    .order('value');
  if (error) {
    console.error('/api/admin/product-options GET error:', error);
    return NextResponse.json({ error: 'Could not load dropdown options. Has the 2026-10-08 migration been run?' }, { status: 500 });
  }

  const options = emptyOptions();
  const rows: { id: string; attribute: string; value: string; sort_order: number }[] = data ?? [];
  for (const row of [...rows].sort((a, b) => a.sort_order - b.sort_order)) {
    if (isProductAttribute(row.attribute)) options[row.attribute].push({ id: row.id, value: row.value });
  }
  return NextResponse.json({ options });
}

/** POST /api/admin/product-options — Body { attribute, value } (admin only). Adding an existing value is fine. */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { attribute, value: raw } = await request.json();
  const value = tidyOption(raw);
  if (!isProductAttribute(attribute)) return NextResponse.json({ error: 'Unknown option type.' }, { status: 400 });
  if (!value || value.length > 60) return NextResponse.json({ error: 'Enter a value up to 60 characters.' }, { status: 400 });

  const { error } = await getServiceClient()
    .from('product_attribute_options')
    .upsert({ attribute, value, sort_order: 100 }, { onConflict: 'attribute,value', ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: 'Could not save the option.' }, { status: 500 });
  return NextResponse.json({ success: true, value });
}

/** DELETE /api/admin/product-options?id= — remove an option from the dropdown (products keep their value). */
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const { error } = await getServiceClient().from('product_attribute_options').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Could not remove the option.' }, { status: 500 });
  return NextResponse.json({ success: true });
}
