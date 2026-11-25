/** Product search used by the header's predictive search (server-side via /api/search). */

export interface SearchableProduct {
  id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  compare_at_price: number | null;
  category: string | null;
  /** Extra words to match on: fabric, fit, pattern, colour names… */
  keywords: string[];
}

export type SearchResult = Omit<SearchableProduct, 'keywords'>;

export const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 60;

/** Trims and limits the query, and drops characters that mean something to database filters. */
export function cleanSearchQuery(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[%_,()*\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH);
}

/**
 * Every word in the query must appear in the product's name, category or keywords.
 * Name matches rank first (name starting with the query, then containing it), then the rest by name.
 */
export function searchProducts(products: SearchableProduct[], query: string, limit = 6): SearchResult[] {
  const q = cleanSearchQuery(query).toLowerCase();
  if (q.length < MIN_QUERY_LENGTH) return [];
  const words = q.split(' ');

  const rank = (p: SearchableProduct) => {
    const name = p.name.toLowerCase();
    return name.startsWith(q) ? 0 : name.includes(q) ? 1 : 2;
  };

  return products
    .filter((p) => {
      const haystack = [p.name, p.category ?? '', ...p.keywords].join(' ').toLowerCase();
      return words.every((w) => haystack.includes(w));
    })
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ keywords: _k, ...rest }) => rest);
}
