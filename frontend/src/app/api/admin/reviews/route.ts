import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUSES = ['pending', 'approved', 'hidden'];

/** GET /api/admin/reviews?status=pending|approved|hidden|all — newest first. Defaults to pending. */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const status = new URL(request.url).searchParams.get('status') || 'pending';
  let query = getServiceClient()
    .from('product_reviews')
    .select('id, rating, title, body, status, created_at, product:products(name, slug), profile:profiles(name, email)')
    .order('created_at', { ascending: false })
    .limit(500);
  if (STATUSES.includes(status)) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) {
    console.error('Admin reviews list failed:', error);
    return NextResponse.json({ error: 'Could not load reviews. Have you run the latest database migration?' }, { status: 500 });
  }
  return NextResponse.json({ reviews: data ?? [] });
}
