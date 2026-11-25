import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { findDeliveredOrder } from '@/lib/reviews';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/products/[id]/reviews/me — can the signed-in customer review this product, and their review if any. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  const supabase = getServiceClient();

  const [orderId, { data: review }] = await Promise.all([
    findDeliveredOrder(supabase, auth.user.id, id),
    supabase
      .from('product_reviews')
      .select('rating, title, body, status')
      .eq('product_id', id)
      .eq('user_id', auth.user.id)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    canReview: !!orderId,
    review: review ? { rating: review.rating, title: review.title, body: review.body, status: review.status } : null,
  });
}
