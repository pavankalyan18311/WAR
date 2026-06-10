import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, ProductVariant, CartSummary } from '@/types';

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string;
  discount: number;
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
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      couponCode: '',
      discount: 0,

      addItem: (product, variant, quantity = 1) => {
        const { items } = get();
        const existing = items.find(
          (i) => i.variant.variant_id === variant.variant_id
        );
        if (existing) {
          const newQty = Math.min(existing.quantity + quantity, 5);
          set({
            items: items.map((i) =>
              i.variant.variant_id === variant.variant_id
                ? { ...i, quantity: newQty }
                : i
            ),
          });
        } else {
          if (items.length >= 10) return;
          const newItem: CartItem = {
            cart_item_id: `${variant.variant_id}-${Date.now()}`,
            product,
            variant,
            quantity,
            price: variant.price_override ?? product.discount_price ?? product.price,
          };
          set({ items: [...items, newItem], isOpen: true });
        }
      },

      removeItem: (cart_item_id) =>
        set((state) => ({
          items: state.items.filter((i) => i.cart_item_id !== cart_item_id),
        })),

      updateQuantity: (cart_item_id, quantity) => {
        if (quantity < 1) {
          get().removeItem(cart_item_id);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.cart_item_id === cart_item_id
              ? { ...i, quantity: Math.min(quantity, 5) }
              : i
          ),
        }));
      },

      clearCart: () => set({ items: [], couponCode: '', discount: 0 }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      applyCoupon: (code, discountAmount) =>
        set({ couponCode: code, discount: discountAmount }),
      removeCoupon: () => set({ couponCode: '', discount: 0 }),

      getSummary: () => {
        const { items, discount } = get();
        const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const shipping = subtotal >= 999 ? 0 : 99;
        const tax = 0; // Inclusive pricing shown
        const total = subtotal - discount + shipping + tax;
        return { subtotal, discount, shipping, tax, total };
      },

      getTotalItems: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'threadx-cart' }
  )
);
