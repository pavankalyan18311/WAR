import { NextResponse } from 'next/server';
import { rateLimit, RATE } from '@/lib/rateLimit';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { getPublicStorageUrl } from '@/lib/supabase/queries';
import { cleanSearchQuery, MIN_QUERY_LENGTH, searchProducts, type SearchableProduct } from '@/lib/search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE = { 'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300' };

function toSearchable(row: any): SearchableProduct {
  const variants = (row.product_variants ?? []).filter((v: any) => v.status === 'active');
  const prices = variants.map((v: any) => Number(v.price)).filter((n: number) => n > 0);
  const price = prices.length ? Math.min(...prices) : 0;
  const cheapest = variants.find((v: any) => Number(v.price) === price);
  const compare = cheapest?.compare_at_price ? Number(cheapest.compare_at_price) : null;
  const media = [...(row.product_media ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
  const colours = [...new Set(variants.map((v: any) => v.color?.name).filter(Boolean))] as string[];
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    image: getPublicStorageUrl(media[0]?.storage_path),
    price,
    compare_at_price: compare && compare > price ? compare : null,
    category: row.product_categories?.[0]?.category?.name ?? null,
    keywords: [row.fabric, row.fit, row.pattern, ...colours, ...(row.product_categories ?? []).map((c: any) => c.category?.name)]
      .filter(Boolean),
  };
}

/** GET /api/search?q=… — up to 6 active products for the header's predictive search. */
export async function GET(request: Request) {
  const limited = rateLimit(request, 'search', RATE.search);
  if (limited) return limited;

  const q = cleanSearchQuery(new URL(request.url).searchParams.get('q'));
  if (q.length < MIN_QUERY_LENGTH) return NextResponse.json({ results: [] }, { headers: CACHE });

  // The catalogue is small, so match in memory (name, category, fabric, fit, pattern, colours).
  const { data, error } = await getServiceClient()
    .from('products')
    .select(`id, name, slug, status, fabric, fit, pattern,
      product_categories(category:categories(name)),
      product_media(storage_path, sort_order),
      product_variants(price, compare_at_price, status, color:colors(name))`)
    .eq('status', 'active')
    .limit(1000);
  if (error) {
    console.error('GET /api/search failed:', error);
    return NextResponse.json({ results: [] });
  }

  return NextResponse.json({ results: searchProducts((data ?? []).map(toSearchable), q, 6) }, { headers: CACHE });
}
