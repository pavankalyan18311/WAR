import { beforeEach, describe, expect, it, vi } from 'vitest';

let dbCart: { variant_id: string; quantity: number }[] = [];
const synced: [string, string, number][] = [];
vi.mock('@/lib/supabase/queries', () => ({
  syncCartItemToDb: async (userId: string, variantId: string, qty: number) => {
    synced.push([userId, variantId, qty]);
    const row = dbCart.find((r) => r.variant_id === variantId);
    if (row) row.quantity = qty; else dbCart.push({ variant_id: variantId, quantity: qty });
    return true;
  },
  removeCartItemFromDb: async () => true,
  clearCartInDb: async () => true,
  fetchUserCartFromDb: async () => dbCart.map((r) => ({
    cart_item_id: `db-${r.variant_id}`, variant_id: r.variant_id, quantity: r.quantity, price: 500,
    product: { product_id: `p-${r.variant_id}`, name: r.variant_id }, variant: { variant_id: r.variant_id, stock_quantity: 10 },
  })),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));

import { useCartStore } from '@/store/cartStore';

const guest = (variant_id: string, quantity: number) => ({
  cart_item_id: `g-${variant_id}`, variant_id, quantity, price: 500,
  product: { product_id: `p-${variant_id}`, name: variant_id }, variant: { variant_id, stock_quantity: 10 },
}) as any;

describe('cart merge on login', () => {
  beforeEach(() => { dbCart = []; synced.length = 0; });

  it("keeps the account's quantity when it is larger, adds guest-only items, and never duplicates lines", async () => {
    dbCart = [{ variant_id: 'a', quantity: 2 }];
    useCartStore.setState({ items: [guest('a', 1), guest('b', 3)], userId: null });

    await useCartStore.getState().initializeUserCart('me');

    const items = useCartStore.getState().items;
    expect(items.map((i) => [i.variant_id, i.quantity]).sort()).toEqual([['a', 2], ['b', 3]]);
    expect(synced).not.toContainEqual(['me', 'a', 1]); // never lowers the saved quantity
  });

  it('uses the guest quantity when it is larger', async () => {
    dbCart = [{ variant_id: 'a', quantity: 1 }];
    useCartStore.setState({ items: [guest('a', 4)], userId: null });
    await useCartStore.getState().initializeUserCart('me');
    expect(useCartStore.getState().items).toEqual([expect.objectContaining({ variant_id: 'a', quantity: 4 })]);
  });
});
