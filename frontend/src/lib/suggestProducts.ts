import type { Product } from '@/types';

const lower = (v?: string | null) => (v ?? '').trim().toLowerCase();

/** How alike two products are: category, fit, gender, tags, colours and price band. */
function similarity(a: Product, b: Product): number {
  let score = 0;
  if (a.category_id && a.category_id === b.category_id) score += 5;
  if (lower(a.fit) && lower(a.fit) === lower(b.fit)) score += 2;
  if (lower(a.gender) && lower(a.gender) === lower(b.gender)) score += 1;
  const tags = new Set((a.tags ?? []).map(lower));
  score += Math.min(2, (b.tags ?? []).filter((t) => tags.has(lower(t))).length);
  const colours = new Set((a.colors ?? []).map((c) => lower(c.name)));
  if ((b.colors ?? []).some((c) => colours.has(lower(c.name)))) score += 1;
  if (a.price > 0 && Math.abs(b.price - a.price) / a.price <= 0.3) score += 2;
  return score;
}

/**
 * "You may also like": the most similar products first, topped up with the rest of the
 * catalogue so the row is never empty. Sold-out products go last; the viewed product is left out.
 */
export function suggestProducts(current: Product, candidates: Product[], limit = 8): Product[] {
  const seen = new Set([current.product_id]);
  const unique = candidates.filter((p) => !seen.has(p.product_id) && seen.add(p.product_id));
  return unique
    .map((p, order) => ({ p, order, score: similarity(current, p), soldOut: p.is_in_stock === false }))
    .sort((x, y) => Number(x.soldOut) - Number(y.soldOut) || y.score - x.score || x.order - y.order)
    .slice(0, limit)
    .map((x) => x.p);
}
