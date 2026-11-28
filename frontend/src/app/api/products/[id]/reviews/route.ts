import { NextResponse } from 'next/server';
import { rateLimit, RATE } from '@/lib/rateLimit';
import { requireUser } from '@/lib/apiAuth';
import { getServiceClient } from '@/lib/admin/routeHelpers';
import { authorLabel, findDeliveredOrder, parseReviewInput, ReviewInputError, summarizeRatings } from '@/lib/reviews';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/products/[id]/reviews — approved reviews for a product, newest first, plus a rating summary. */
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const { data, error } = await getServiceClient()
    .from('product_reviews')
    .select('id, rating, title, body, created_at, user_id, profile:profiles(name)')
    .eq('product_id', id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    console.error('GET reviews failed:', error);
    return NextResponse.json({ reviews: [], summary: summarizeRatings([]) });
  }

  const rows = data ?? [];
  return NextResponse.json({
    summary: summarizeRatings(rows.map((r: any) => r.rating)),
    reviews: rows.map((r: any) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      created_at: r.created_at,
      author: authorLabel(r.profile?.name),
      verified: true,
    })),
  });
}

/** POST /api/products/[id]/reviews — Body: { rating, title?, body }. Customers who received the product only. */
export async function POST(request: Request, { params }: Ctx) {
  const limited = rateLimit(request, 'review', RATE.form);
  if (limited) return limited;

  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { id } = await params;

  let input;
  try {
    input = parseReviewInput(await request.json().catch(() => ({})));
  } catch (err) {
    if (err instanceof ReviewInputError) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }

  const supabase = getServiceClient();
  const orderId = await findDeliveredOrder(supabase, auth.user.id, id);
  if (!orderId) {
    return NextResponse.json({ error: 'You can review this product once your order has been delivered.' }, { status: 403 });
  }

  const { error } = await supabase.from('product_reviews').upsert(
    { product_id: id, user_id: auth.user.id, order_id: orderId, ...input, status: 'pending', updated_at: new Date().toISOString() },
    { onConflict: 'product_id,user_id' },
  );
  if (error) {
    console.error('POST review failed:', error);
    return NextResponse.json({ error: 'Could not save your review. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, message: 'Thank you! Your review will appear once it has been checked.' });
}
