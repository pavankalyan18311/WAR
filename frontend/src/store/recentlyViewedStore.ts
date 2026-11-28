import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/types';

const MAX_ITEMS = 10;

interface RecentlyViewedStore {
  items: Product[];
  addItem: (product: Product) => void;
  clearItems: () => void;
  /** Drop products that are no longer in the shop (deleted or unpublished). */
  prune: (liveIds: string[]) => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        const current = get().items.filter((p) => p.product_id !== product.product_id);
        set({ items: [product, ...current].slice(0, MAX_ITEMS) });
      },
      clearItems: () => set({ items: [] }),
      prune: (liveIds) => {
        const live = new Set(liveIds);
        const items = get().items.filter((p) => live.has(p.product_id));
        if (items.length !== get().items.length) set({ items });
      },
    }),
    { name: 'threadx-recently-viewed' }
  )
);
