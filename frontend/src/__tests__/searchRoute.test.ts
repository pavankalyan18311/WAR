// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

let rows: any[];
const eqCalls: [string, any][] = [];
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => {
      const b: any = {
        select: () => b,
        eq: (k: string, v: any) => { eqCalls.push([k, v]); return b; },
        limit: () => b,
        then: (resolve: any) => resolve({ data: rows.filter((r) => eqCalls.every(([k, v]) => r[k] === v)), error: null }),
      };
      return b;
    },
  }),
}));

const row = (over: any) => ({
  id: 'p', name: 'Tee', slug: 'tee', status: 'active', fabric: null, fit: null, pattern: null,
  product_categories: [{ category: { name: 'Oversized' } }],
  product_media: [{ storage_path: 'https://x/a.jpg', sort_order: 0 }],
  product_variants: [{ price: 999, compare_at_price: 1299, status: 'active', color: { name: 'Black' } }],
  ...over,
});

const get = async (q: string) => (await import('@/app/api/search/route')).GET(new Request(`http://x/api/search?q=${encodeURIComponent(q)}`));

describe('GET /api/search', () => {
  beforeEach(() => {
    eqCalls.length = 0;
    rows = [
      row({ id: '1', name: 'Shadow Oversized Tee', slug: 'shadow' }),
      row({ id: '2', name: 'Hidden Draft Tee', slug: 'draft', status: 'draft' }),
      ...Array.from({ length: 10 }, (_, i) => row({ id: `m${i}`, name: `Mono Tee ${i}`, slug: `mono-${i}` })),
    ];
  });

  it('needs at least 2 characters (empty result, not an error)', async () => {
    const res = await get('t');
    expect(res.status).toBe(200);
    expect((await res.json()).results).toEqual([]);
  });

  it('returns only active products, with image, category and lowest price', async () => {
    const body = await (await get('shadow')).json();
    expect(body.results).toEqual([{
      id: '1', name: 'Shadow Oversized Tee', slug: 'shadow', image: 'https://x/a.jpg', price: 999, compare_at_price: 1299, category: 'Oversized',
    }]);
    expect(eqCalls).toContainEqual(['status', 'active']);
    expect((await (await get('draft')).json()).results).toEqual([]);
  });

  it('returns at most 6 results and allows short caching', async () => {
    const res = await get('mono');
    expect((await res.json()).results).toHaveLength(6);
    expect(res.headers.get('Cache-Control')).toMatch(/max-age/);
  });

  it('matches colour names from variants', async () => {
    expect((await (await get('black shadow')).json()).results.map((r: any) => r.id)).toEqual(['1']);
  });
});
