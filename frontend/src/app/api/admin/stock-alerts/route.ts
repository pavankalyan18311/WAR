import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Group {
  variant_id: string;
  product: string;
  slug: string | null;
  size: string | null;
  color: string | null;
  count: number;
  latest: string;
}

/** GET /api/admin/stock-alerts — pending "notify me" requests, grouped by product + size, most wanted first. */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { data, error } = await getServiceClient()
    .from('stock_alerts')
    .select('variant_id, created_at, variant:product_variants(size_option:size_options(name), color:colors(name), product:products(name, slug))')
    .is('notified_at', null)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Admin stock alerts failed:', error);
    return NextResponse.json({ error: 'Could not load back-in-stock requests. Have you run the latest database migration?' }, { status: 500 });
  }

  const groups = new Map<string, Group>();
  for (const row of data ?? []) {
    const g = groups.get(row.variant_id);
    if (g) {
      g.count += 1;
      if (row.created_at > g.latest) g.latest = row.created_at;
    } else {
      groups.set(row.variant_id, {
        variant_id: row.variant_id,
        product: row.variant?.product?.name ?? 'Deleted product',
        slug: row.variant?.product?.slug ?? null,
        size: row.variant?.size_option?.name ?? null,
        color: row.variant?.color?.name ?? null,
        count: 1,
        latest: row.created_at,
      });
    }
  }
  return NextResponse.json({ groups: [...groups.values()].sort((a, b) => b.count - a.count || b.latest.localeCompare(a.latest)) });
}
