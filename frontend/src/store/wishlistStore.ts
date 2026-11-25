import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getProducts } from '@/lib/supabase/queries';
import { useAuthStore } from '@/store/authStore';
import type { WishlistItem, Product } from '@/types';

interface WishlistStore {
  items: WishlistItem[];
  addItem: (product: Product) => Promise<void>;
  removeItem: (product_id: string) => Promise<void>;
  isInWishlist: (product_id: string) => boolean;
  toggleItem: (product: Product) => Promise<void>;
  getTotalItems: () => number;
  /** On login: merge this browser's wishlist with the account's saved wishlist. */
  syncFromDb: (userId: string) => Promise<void>;
  clearItems: () => void;
}

/** Signed-in user's id (wishlist is saved to their account), or null for guests (browser only). */
const currentUserId = () => useAuthStore.getState().user?.id ?? null;

const toItem = (product: Product): WishlistItem => ({
  wishlist_item_id: `${product.product_id}-${Date.now()}`,
  product,
  added_at: new Date().toISOString(),
});

/** Saves through our server (/api/wishlist), which checks the session — the browser never writes the table directly. */
async function callWishlistApi(url: string, init?: RequestInit): Promise<any> {
  try {
    const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err: any) {
    console.warn('Wishlist could not be saved to your account right now:', err?.message);
    return null;
  }
}

const saveIds = (product_ids: string[]) =>
  callWishlistApi('/api/wishlist', { method: 'POST', body: JSON.stringify({ product_ids }) });

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: async (product) => {
        if (get().isInWishlist(product.product_id)) return;
        set({ items: [...get().items, toItem(product)] });
        if (currentUserId()) await saveIds([product.product_id]);
      },

      removeItem: async (product_id) => {
        set((state) => ({ items: state.items.filter((i) => i.product.product_id !== product_id) }));
        if (currentUserId()) {
          await callWishlistApi(`/api/wishlist?product_id=${encodeURIComponent(product_id)}`, { method: 'DELETE' });
        }
      },

      isInWishlist: (product_id) => get().items.some((i) => i.product.product_id === product_id),

      toggleItem: async (product) => {
        if (get().isInWishlist(product.product_id)) await get().removeItem(product.product_id);
        else await get().addItem(product);
      },

      getTotalItems: () => get().items.length,

      syncFromDb: async () => {
        try {
          const saved = await callWishlistApi('/api/wishlist');
          if (!saved) return; // keep the local list if the account can't be reached
          const savedIds = new Set<string>(saved.product_ids ?? []);
          const localOnly = get().items.map((i) => i.product.product_id).filter((id) => !savedIds.has(id));
          if (localOnly.length) await saveIds(localOnly);

          // Fresh product data (price, stock, images) for everything on the account; drops unpublished products.
          const wanted = new Set([...savedIds, ...localOnly]);
          const products: Product[] = (await getProducts()).filter((p: Product) => wanted.has(p.product_id));
          set({ items: products.map(toItem) });
        } catch (err) {
          console.error('Wishlist sync failed:', err);
        }
      },

      clearItems: () => set({ items: [] }),
    }),
    { name: 'war-wishlist' }
  )
);

/** Re-renders whenever this product is added to / removed from the wishlist (use this for heart icons). */
export const useIsInWishlist = (productId: string | undefined) =>
  useWishlistStore((s) => !!productId && s.items.some((i) => i.product.product_id === productId));
