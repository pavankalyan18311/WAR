export class ReviewInputError extends Error {}

export interface ReviewInput {
  rating: number;
  title: string | null;
  body: string;
}

/** Validates a customer's review; throws ReviewInputError with a message to show them. */
export function parseReviewInput(raw: any): ReviewInput {
  const rating = Number(raw?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ReviewInputError('Please choose a rating from 1 to 5 stars.');

  const title = typeof raw?.title === 'string' ? raw.title.trim() : '';
  if (title.length > 80) throw new ReviewInputError('Please keep the title under 80 characters.');

  const body = typeof raw?.body === 'string' ? raw.body.trim() : '';
  if (body.length < 10) throw new ReviewInputError('Please write at least 10 characters.');
  if (body.length > 1500) throw new ReviewInputError('Please keep your review under 1500 characters.');

  return { rating, title: title || null, body };
}

export interface RatingSummary {
  average: number;
  count: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function summarizeRatings(ratings: number[]): RatingSummary {
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as RatingSummary['breakdown'];
  for (const r of ratings) breakdown[r as 1 | 2 | 3 | 4 | 5] += 1;
  const count = ratings.length;
  const average = count ? Math.round((ratings.reduce((a, b) => a + b, 0) / count) * 10) / 10 : 0;
  return { average, count, breakdown };
}

/** Public name on a review: "Ravi S." — never the full name or email. */
export function authorLabel(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'WAR customer';
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/** The customer's delivered order containing this product (needed to review it), or null. */
export async function findDeliveredOrder(supabase: any, userId: string, productId: string): Promise<string | null> {
  const { data } = await supabase
    .from('order_items')
    .select('order_id, orders!inner(user_id, status)')
    .eq('product_id', productId)
    .neq('status', 'cancelled')
    .eq('orders.user_id', userId)
    .eq('orders.status', 'delivered')
    .limit(1);
  return data?.[0]?.order_id ?? null;
}
