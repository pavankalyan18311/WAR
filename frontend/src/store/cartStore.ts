import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, ProductVariant, CartSummary } from '@/types';
import {
  syncCartItemToDb,
  removeCartItemFromDb,
  clearCartInDb,
  fetchUserCartFromDb,
} from '@/lib/supabase/queries';

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string;
  discount: number;
  userId: string | null;
  syncing: boolean;

  setUserId: (userId: string | null) => void;
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  removeItem: (cart_item_id: string) => void;
  updateQuantity: (cart_item_id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  applyCoupon: (code: string, discountAmount: number) => void;
  removeCoupon: () => void;
  getSummary: () => CartSummary;
  getTotalItems: () => number;
  initializeUserCart: (userId: string) => Promise<void>;
  resetUserCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      couponCode: '',
      discount: 0,
      userId: null,
      syncing: false,

      setUserId: (userId) => set({ userId }),

      addItem: (product, variant, quantity = 1) => {
        const { items, userId } = get();
        const existing = items.find(
          (i) => i.variant?.variant_id === variant.variant_id || i.variant_id === variant.variant_id
        );

        let targetQty = quantity;
        let nextItems: CartItem[] = [];

        if (existing) {
          targetQty = Math.min(existing.quantity + quantity, 10);
          nextItems = items.map((i) =>
            i.variant?.variant_id === variant.variant_id || i.variant_id === variant.variant_id
              ? { ...i, quantity: targetQty }
              : i
          );
        } else {
          const newItem: CartItem = {
            cart_item_id: `${variant.variant_id}-${Date.now()}`,
            variant_id: variant.variant_id,
            product,
            variant,
            quantity,
            price: Number(variant.price || product.price || 0),
          };
          nextItems = [...items, newItem];
        }

        set({ items: nextItems, isOpen: true });

        // Persist to Supabase Database if user is authenticated
        if (userId) {
          syncCartItemToDb(userId, variant.variant_id, targetQty).catch((err) =>
            console.error('Failed to sync item to DB:', err)
          );
        }
      },

      removeItem: (cart_item_id) => {
        const { items, userId } = get();
        const targetItem = items.find((i) => i.cart_item_id === cart_item_id || i.id === cart_item_id);
        
        set((state) => ({
          items: state.items.filter((i) => i.cart_item_id !== cart_item_id && i.id !== cart_item_id),
        }));

        if (userId && targetItem) {
          const variantId = targetItem.variant_id || targetItem.variant?.variant_id;
          if (variantId) {
            removeCartItemFromDb(userId, variantId).catch((err) =>
              console.error('Failed to remove item from DB:', err)
            );
          }
        }
      },

      updateQuantity: (cart_item_id, quantity) => {
        const { items, userId } = get();
        if (quantity < 1) {
          get().removeItem(cart_item_id);
          return;
        }

        const targetItem = items.find((i) => i.cart_item_id === cart_item_id || i.id === cart_item_id);
        const nextQty = Math.min(quantity, 10);

        set((state) => ({
          items: state.items.map((i) =>
            i.cart_item_id === cart_item_id || i.id === cart_item_id
              ? { ...i, quantity: nextQty }
              : i
          ),
        }));

        if (userId && targetItem) {
          const variantId = targetItem.variant_id || targetItem.variant?.variant_id;
          if (variantId) {
            syncCartItemToDb(userId, variantId, nextQty).catch((err) =>
              console.error('Failed to update item quantity in DB:', err)
            );
          }
        }
      },

      clearCart: () => {
        const { userId } = get();
        set({ items: [], couponCode: '', discount: 0 });

        if (userId) {
          clearCartInDb(userId).catch((err) =>
            console.error('Failed to clear cart in DB:', err)
          );
        }
      },

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      applyCoupon: (code, discountAmount) =>
        set({ couponCode: code.toUpperCase().trim(), discount: discountAmount }),
      removeCoupon: () => set({ couponCode: '', discount: 0 }),

      getSummary: () => {
        const { items, couponCode } = get();
        const subtotal = items.reduce((sum, i) => sum + (Number(i.price) || 0) * i.quantity, 0);
        let shipping = subtotal >= 999 ? 0 : 99;
        let discount = 0;

        const code = couponCode.toUpperCase().trim();
        if (code === 'WAR10') {
          discount = Math.round(subtotal * 0.10);
        } else if (code === 'WELCOME20') {
          discount = Math.round(subtotal * 0.20);
        } else if (code === 'FREESHIP') {
          shipping = 0;
          discount = 0;
        } else if (get().discount > 0) {
          discount = get().discount;
        }

        const tax = 0;
        const total = Math.max(0, subtotal - discount + shipping + tax);
        return { subtotal, discount, shipping, tax, total };
      },

      getTotalItems: () =>
        get().items.reduce((sum, i) => sum + (i.quantity || 0), 0),

      initializeUserCart: async (userId: string) => {
        if (!userId) return;
        const guestItems = get().items;
        set({ userId, syncing: true });

        try {
          // If guest user had items locally, merge them into Supabase database cart
          if (guestItems.length > 0) {
            for (const item of guestItems) {
              const variantId = item.variant_id || item.variant?.variant_id;
              if (variantId) {
                await syncCartItemToDb(userId, variantId, item.quantity);
              }
            }
          }

          // Fetch full database cart from Supabase
          const dbCartItems = await fetchUserCartFromDb(userId);
          if (dbCartItems && Array.isArray(dbCartItems)) {
            set({ items: dbCartItems, syncing: false });
          } else {
            set({ syncing: false });
          }
        } catch (err) {
          console.error('initializeUserCart error:', err);
          set({ syncing: false });
        }
      },

      resetUserCart: () => {
        set({ userId: null, items: [], couponCode: '', discount: 0 });
      },
    }),
    { name: 'war-cart' }
  )
);
