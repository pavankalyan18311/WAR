import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';
import type { WishlistItem, Product } from '@/types';

interface WishlistStore {
  items: WishlistItem[];
  addItem: (product: Product, userId?: string) => Promise<void>;
  removeItem: (product_id: string, userId?: string) => Promise<void>;
  isInWishlist: (product_id: string) => boolean;
  toggleItem: (product: Product, userId?: string) => Promise<void>;
  getTotalItems: () => number;
  syncFromDb: (userId: string) => Promise<void>;
  clearItems: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: async (product, userId) => {
        const { items } = get();
        const exists = items.some((i) => i.product.product_id === product.product_id);
        if (exists) return;

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

        if (userId) {
          try {
            const supabase = createClient();
            await (supabase as any).from('wishlist').insert({ user_id: userId, product_id: product.product_id });
          } catch {
            // local state already updated, DB sync is best-effort
          }
        }
      },

      removeItem: async (product_id, userId) => {
        set((state) => ({
          items: state.items.filter((i) => i.product.product_id !== product_id),
        }));

        if (userId) {
          try {
            const supabase = createClient();
            await (supabase as any)
              .from('wishlist')
              .delete()
              .eq('user_id', userId)
              .eq('product_id', product_id);
          } catch {
            // best-effort
          }
        }
      },

      isInWishlist: (product_id) =>
        get().items.some((i) => i.product.product_id === product_id),

      toggleItem: async (product, userId) => {
        const { isInWishlist, addItem, removeItem } = get();
        if (isInWishlist(product.product_id)) {
          await removeItem(product.product_id, userId);
        } else {
          await addItem(product, userId);
        }
      },

      getTotalItems: () => get().items.length,

      syncFromDb: async (userId) => {
        try {
          const supabase = createClient();
          const { data } = await (supabase as any)
            .from('wishlist')
            .select('product_id, created_at')
            .eq('user_id', userId);

          if (!data || data.length === 0) return;

          const localItems = get().items;
          const dbIds = new Set((data as any[]).map((r) => r.product_id));

          // Remove local items that were deleted from DB on another device
          const synced = localItems.filter((i) => dbIds.has(i.product.product_id));

          // Push local-only items to DB
          const localOnly = localItems.filter((i) => !dbIds.has(i.product.product_id));
          if (localOnly.length > 0) {
            await (supabase as any).from('wishlist').upsert(
              localOnly.map((i) => ({ user_id: userId, product_id: i.product.product_id })),
              { onConflict: 'user_id,product_id' }
            );
          }

          set({ items: synced });
        } catch {
          // best-effort sync
        }
      },

      clearItems: () => set({ items: [] }),
    }),
    { name: 'war-wishlist' }
  )
);
