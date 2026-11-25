import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, ProductVariant, CartSummary } from '@/types';
import {
  syncCartItemToDb,
  removeCartItemFromDb,
  clearCartInDb,
  fetchUserCartFromDb,
} from '@/lib/supabase/queries';
import { computeTotals, type StoreSettings } from '@/lib/checkout/pricing';
import { DEFAULT_STORE_SETTINGS, loadStoreSettings } from '@/lib/checkout/storeSettings';
import { createClient } from '@/lib/supabase/client';
import type { CartQuote } from '@/lib/checkout/quote';
import { formatPrice } from '@/lib/utils';

/** Customers can buy as many as are in stock (the server re-checks stock at checkout). */
function clampQty(quantity: number, variant?: { stock_quantity?: number }) {
  const stock = variant?.stock_quantity ?? Infinity;
  return Math.max(0, Math.min(quantity, stock));
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string;
  discount: number;
  discountType: 'percentage' | 'flat' | 'free_shipping' | null;
  userId: string | null;
  syncing: boolean;
  shippingSettings: StoreSettings;
  loadShippingSettings: () => Promise<void>;

  setUserId: (userId: string | null) => void;
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  removeItem: (cart_item_id: string) => void;
  updateQuantity: (cart_item_id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  applyCoupon: (code: string, discountAmount: number, discountType?: 'percentage' | 'flat' | 'free_shipping') => void;
  removeCoupon: () => void;
  getSummary: () => CartSummary;
  getTotalItems: () => number;
  initializeUserCart: (userId: string) => Promise<void>;
  resetUserCart: () => void;
  /** Per-variant problems from the last server check, e.g. { v1: 'No longer available' } */
  lineIssues: Record<string, string>;
  /** One-off messages about changes made to the cart (price changed, coupon removed…) */
  notices: string[];
  dismissNotices: () => void;
  /** Asks the server for current prices/stock/coupon and updates the cart. Null if it couldn't be reached. */
  refreshQuote: () => Promise<CartQuote | null>;
  /** True when an item is unavailable or was reduced — the customer must review before checkout. */
  hasBlockingIssues: () => boolean;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      couponCode: '',
      discount: 0,
      discountType: null,
      userId: null,
      syncing: false,
      shippingSettings: DEFAULT_STORE_SETTINGS,
      lineIssues: {},
      notices: [],

      dismissNotices: () => set({ notices: [] }),

      hasBlockingIssues: () => {
        const { items, lineIssues } = get();
        return items.some((i) => lineIssues[(i.variant_id || i.variant?.variant_id) as string] === 'No longer available');
      },

      refreshQuote: async () => {
        const { items, couponCode } = get();
        if (items.length === 0) {
          set({ lineIssues: {} });
          return null;
        }
        let quote: CartQuote;
        try {
          const res = await fetch('/api/orders/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: items.map((i) => ({ variant_id: i.variant_id || i.variant?.variant_id, quantity: i.quantity })),
              coupon_code: couponCode || undefined,
            }),
          });
          if (!res.ok) return null;
          quote = await res.json();
        } catch {
          return null; // offline — keep the cart as it is; the server re-checks at checkout anyway
        }

        const byVariant = new Map(quote.lines.map((l) => [l.variant_id, l]));
        const lineIssues: Record<string, string> = {};
        const notices: string[] = [];
        const { userId } = get();

        const nextItems = get().items.map((item) => {
          const variantId = (item.variant_id || item.variant?.variant_id) as string;
          const line = byVariant.get(variantId);
          if (!line) return item;
          const name = item.product?.name || line.name || 'An item';

          if (line.status === 'unavailable') {
            lineIssues[variantId] = 'No longer available';
            return { ...item, variant: { ...item.variant, stock_quantity: 0 } };
          }

          let next = item;
          if (line.unit_price > 0 && Number(item.price) !== line.unit_price) {
            notices.push(`The price of ${name} changed to ${formatPrice(line.unit_price)}.`);
            next = { ...next, price: line.unit_price, variant: { ...next.variant, price: line.unit_price } };
          }
          if (line.status === 'reduced') {
            lineIssues[variantId] = `Only ${line.available} left — quantity reduced`;
            next = { ...next, quantity: line.quantity };
            if (userId) syncCartItemToDb(userId, variantId, line.quantity).catch(() => {});
          }
          return { ...next, variant: { ...next.variant, stock_quantity: line.available } };
        });

        const couponPatch: Partial<CartStore> = {};
        if (quote.coupon && !quote.coupon.ok) {
          notices.push(`Coupon ${quote.coupon.code} was removed: ${quote.coupon.error}`);
          Object.assign(couponPatch, { couponCode: '', discount: 0, discountType: null });
        } else if (quote.coupon?.ok && get().discountType !== 'free_shipping') {
          couponPatch.discount = quote.totals.discount;
        }

        set({ items: nextItems, lineIssues, notices: [...get().notices, ...notices], ...couponPatch });
        return quote;
      },

      loadShippingSettings: async () => {
        try {
          set({ shippingSettings: await loadStoreSettings(createClient()) });
        } catch (err) {
          console.error('Failed to load shipping settings:', err);
        }
      },

      setUserId: (userId) => set({ userId }),

      addItem: (product, variant, quantity = 1) => {
        const { items, userId } = get();
        const existing = items.find(
          (i) => i.variant?.variant_id === variant.variant_id || i.variant_id === variant.variant_id
        );

        let targetQty = clampQty(quantity, variant);
        if (targetQty < 1) return;
        let nextItems: CartItem[] = [];

        if (existing) {
          targetQty = clampQty(existing.quantity + quantity, variant);
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
            quantity: targetQty,
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
        const nextQty = clampQty(quantity, targetItem?.variant);
        if (nextQty < 1) return; // out of stock: leave it (the cart shows it as unavailable)

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
        set({ items: [], couponCode: '', discount: 0, discountType: null });

        if (userId) {
          clearCartInDb(userId).catch((err) =>
            console.error('Failed to clear cart in DB:', err)
          );
        }
      },

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      applyCoupon: (code, discountAmount, discountType) =>
        set({
          couponCode: code.toUpperCase().trim(),
          discount: discountAmount,
          discountType: discountType ?? null,
        }),
      removeCoupon: () => set({ couponCode: '', discount: 0, discountType: null }),

      getSummary: () => {
        // Preview only — the server re-prices everything at checkout.
        const { items, discount, discountType, shippingSettings } = get();
        const lines = items.map((i) => ({ unit_price: Number(i.price) || 0, quantity: i.quantity }));
        // The validated coupon amount is applied as a flat discount for the preview.
        const coupon = discountType === 'free_shipping'
          ? { discount_type: 'free_shipping' as const, discount_value: 0, max_discount_amount: null }
          : discount > 0
            ? { discount_type: 'flat' as const, discount_value: discount, max_discount_amount: null }
            : null;
        return computeTotals(lines, shippingSettings, coupon);
      },

      getTotalItems: () =>
        get().items.reduce((sum, i) => sum + (i.quantity || 0), 0),

      initializeUserCart: async (userId: string) => {
        if (!userId) return;
        const guestItems = get().items;
        set({ userId, syncing: true });

        try {
          // Merge this browser's (guest) cart into the account cart: one line per variant,
          // keeping the larger quantity so neither cart loses items.
          if (guestItems.length > 0) {
            const saved = await fetchUserCartFromDb(userId);
            const savedQty = new Map<string, number>((saved ?? []).map((i: any) => [i.variant_id || i.variant?.variant_id, Number(i.quantity) || 0]));
            for (const item of guestItems) {
              const variantId = item.variant_id || item.variant?.variant_id;
              if (variantId && item.quantity > (savedQty.get(variantId) ?? 0)) {
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
        set({ userId: null, items: [], couponCode: '', discount: 0, discountType: null });
      },
    }),
    {
      name: 'war-cart',
      partialize: ({ shippingSettings: _settings, isOpen: _open, syncing: _syncing, lineIssues: _issues, notices: _notices, ...rest }) => rest,
    }
  )
);
