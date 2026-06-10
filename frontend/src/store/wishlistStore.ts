import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WishlistItem, Product } from '@/types';

interface WishlistStore {
  items: WishlistItem[];
  addItem: (product: Product) => void;
  removeItem: (product_id: string) => void;
  isInWishlist: (product_id: string) => boolean;
  toggleItem: (product: Product) => void;
  getTotalItems: () => number;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const { items } = get();
        const exists = items.some((i) => i.product.product_id === product.product_id);
        if (!exists) {
          set({
            items: [
              ...items,
              {
                wishlist_item_id: `${product.product_id}-${Date.now()}`,
                product,
                added_at: new Date().toISOString(),
              },
            ],
          });
        }
      },

      removeItem: (product_id) =>
        set((state) => ({
          items: state.items.filter((i) => i.product.product_id !== product_id),
        })),

      isInWishlist: (product_id) =>
        get().items.some((i) => i.product.product_id === product_id),

      toggleItem: (product) => {
        const { isInWishlist, addItem, removeItem } = get();
        if (isInWishlist(product.product_id)) {
          removeItem(product.product_id);
        } else {
          addItem(product);
        }
      },

      getTotalItems: () => get().items.length,
    }),
    { name: 'threadx-wishlist' }
  )
);
