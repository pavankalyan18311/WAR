import { describe, expect, it } from 'vitest';
import { cleanSearchQuery, searchProducts, type SearchableProduct } from '@/lib/search';

const p = (over: Partial<SearchableProduct>): SearchableProduct => ({
  id: 'x', name: 'Tee', slug: 'tee', image: '', price: 999, compare_at_price: null,
  category: null, keywords: [], ...over,
});

const catalogue = [
  p({ id: '1', name: 'Shadow Oversized Tee', slug: 'shadow', category: 'Oversized', keywords: ['Black', 'Cotton'] }),
  p({ id: '2', name: 'Classic Oxford Shirt', slug: 'oxford', category: 'Shirts', keywords: ['Blue', 'Oxford Cotton'] }),
  p({ id: '3', name: 'Oversized Graphic Tee', slug: 'graphic', category: 'T-Shirts', keywords: ['White'] }),
  p({ id: '4', name: 'Relaxed Jeans', slug: 'jeans', category: 'Jeans', keywords: ['Black', 'Denim'] }),
];

describe('cleanSearchQuery', () => {
  it('trims, collapses spaces and caps length', () => {
    expect(cleanSearchQuery('  black   tee ')).toBe('black tee');
    expect(cleanSearchQuery('x'.repeat(200))).toHaveLength(60);
  });
  it('strips characters that have meaning in database filters', () => {
    expect(cleanSearchQuery('tee%_,()*\\')).toBe('tee');
  });
  it('returns empty for non-strings', () => {
    expect(cleanSearchQuery(null)).toBe('');
  });
});

describe('searchProducts', () => {
  it('ranks name-starts-with above name-contains above category/colour matches', () => {
    expect(searchProducts(catalogue, 'oversized').map((r) => r.id)).toEqual(['3', '1']);
  });

  it('matches category, fabric and colour words', () => {
    expect(searchProducts(catalogue, 'black').map((r) => r.id).sort()).toEqual(['1', '4']);
    expect(searchProducts(catalogue, 'shirts').map((r) => r.id)).toEqual(['2', '3']); // Shirts + T-Shirts
    expect(searchProducts(catalogue, 'denim').map((r) => r.id)).toEqual(['4']);
  });

  it('every word must match somewhere (AND), case-insensitive', () => {
    expect(searchProducts(catalogue, 'BLACK tee').map((r) => r.id)).toEqual(['1']);
  });

  it('limits results', () => {
    const many = Array.from({ length: 20 }, (_, i) => p({ id: String(i), name: `Tee ${i}` }));
    expect(searchProducts(many, 'tee', 6)).toHaveLength(6);
  });

  it('returns nothing for queries under 2 characters', () => {
    expect(searchProducts(catalogue, 't')).toEqual([]);
  });
});
