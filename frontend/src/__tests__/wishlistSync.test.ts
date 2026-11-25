import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWishlistStore } from '@/store/wishlistStore';
import { useAuthStore } from '@/store/authStore';

let savedIds: string[] = [];
const fetchMock = vi.fn(async (url: string, init?: any) => {
  const method = init?.method ?? 'GET';
  const body = init?.body ? JSON.parse(init.body) : {};
  if (method === 'GET') return { ok: true, json: async () => ({ product_ids: savedIds }) };
  if (method === 'POST') { savedIds = [...new Set([...savedIds, ...body.product_ids])]; return { ok: true, json: async () => ({ product_ids: savedIds }) }; }
  if (method === 'DELETE') { const id = new URL(`http://x${url}`).searchParams.get('product_id'); savedIds = savedIds.filter((x) => x !== id); return { ok: true, json: async () => ({}) }; }
  return { ok: false, json: async () => ({}) };
});

const product = (id: string) => ({ product_id: id, id, name: id, slug: id, price: 1, images: [], status: 'active' }) as any;
vi.mock('@/lib/supabase/queries', () => ({
  getProducts: async () => [product('p1'), product('p2')],
}));

describe('Wishlist ↔ account (via /api/wishlist)', () => {
  beforeEach(() => {
    savedIds = [];
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    useWishlistStore.setState({ items: [] });
    useAuthStore.setState({ user: { id: 'me' } as any });
  });

  it('saves and removes through the server for the signed-in user', async () => {
    await useWishlistStore.getState().toggleItem(product('p1'));
    expect(savedIds).toEqual(['p1']);
    expect(fetchMock).toHaveBeenCalledWith('/api/wishlist', expect.objectContaining({ method: 'POST' }));

    await useWishlistStore.getState().toggleItem(product('p1'));
    expect(savedIds).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith('/api/wishlist?product_id=p1', expect.objectContaining({ method: 'DELETE' }));
  });

  it('stays local for guests', async () => {
    useAuthStore.setState({ user: null });
    await useWishlistStore.getState().addItem(product('p1'));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useWishlistStore.getState().items).toHaveLength(1);
  });

  it('on login, loads items saved on another device and uploads local-only ones', async () => {
    savedIds = ['p2'];
    useWishlistStore.setState({ items: [{ wishlist_item_id: 'x', product: product('p1'), added_at: '' }] });

    await useWishlistStore.getState().syncFromDb('me');

    expect(useWishlistStore.getState().items.map((i) => i.product.product_id).sort()).toEqual(['p1', 'p2']);
    expect(savedIds.sort()).toEqual(['p1', 'p2']);
  });

  it('keeps the heart on in the browser even if the server is unreachable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await useWishlistStore.getState().addItem(product('p1'));
    expect(useWishlistStore.getState().isInWishlist('p1')).toBe(true);
  });
});
