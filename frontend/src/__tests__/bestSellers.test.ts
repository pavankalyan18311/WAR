import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const products = [
  { id: 'p1', name: 'A', slug: 'a', status: 'active', product_media: [], product_variants: [] },
  { id: 'p2', name: 'B', slug: 'b', status: 'active', product_media: [], product_variants: [] },
  { id: 'p3', name: 'C', slug: 'c', status: 'active', product_media: [], product_variants: [] },
];

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc,
    from: () => {
      const b: any = { select: () => b, eq: () => b, order: () => b, limit: () => b, then: (r: any) => r({ data: products, error: null }) };
      return b;
    },
  }),
}));

describe('getBestSellers', () => {
  beforeEach(() => rpc.mockReset());

  it('returns products ranked by units actually sold', async () => {
    rpc.mockResolvedValue({ data: [{ product_id: 'p3', units: 9 }, { product_id: 'p1', units: 4 }], error: null });
    const { getBestSellers } = await import('@/lib/supabase/queries');
    const result = await getBestSellers(4);
    expect(rpc).toHaveBeenCalledWith('best_selling_product_ids', { p_limit: 4 });
    expect(result.map((p: any) => p.id)).toEqual(['p3', 'p1']);
  });

  it('returns nothing (not a made-up list) when there are no sales yet', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const { getBestSellers } = await import('@/lib/supabase/queries');
    expect(await getBestSellers(4)).toEqual([]);
  });

  it('returns nothing if the sales function is not available', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'function does not exist' } });
    const { getBestSellers } = await import('@/lib/supabase/queries');
    expect(await getBestSellers(4)).toEqual([]);
  });
});
