import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useAuthStore } from '../store/authStore';
import type { Product, ProductVariant } from '../types';

const mockProduct: Product = {
  product_id: 'prod-test-1',
  slug: 'test-oversized-tee',
  name: 'Test Oversized Tee',
  description: 'Test description',
  price: 1499,
  discount_price: 999,
  is_in_stock: true,
  rating: 4.8,
  review_count: 15,
  images: [{ url: 'https://example.com/tee.jpg' }],
  variants: [
    {
      variant_id: 'var-1',
      product_id: 'prod-test-1',
      size: 'L',
      color: 'Black',
      stock: 10,
    },
  ],
};

const mockVariant: ProductVariant = mockProduct.variants![0];

describe('End-to-End Store Integrity Tests', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
    useWishlistStore.getState().clearWishlist();
  });

  describe('Cart Store Operations', () => {
    it('adds product items into cart and calculates summary correctly', () => {
      const cart = useCartStore.getState();
      cart.addItem(mockProduct, mockVariant, 2);

      const items = useCartStore.getState().items;
      expect(items.length).toBe(1);
      expect(items[0].quantity).toBe(2);
      expect(items[0].price).toBe(999);

      const summary = useCartStore.getState().getSummary();
      expect(summary.subtotal).toBe(1998);
      // Since subtotal > 999, shipping should be free (0)
      expect(summary.shipping).toBe(0);
      expect(summary.total).toBe(1998);
    });

    it('applies coupon codes accurately to cart subtotal', () => {
      const cart = useCartStore.getState();
      cart.addItem(mockProduct, mockVariant, 1);

      // Apply 20% coupon code SUMMER20
      cart.applyCoupon('SUMMER20', 200);
      let summary = useCartStore.getState().getSummary();
      expect(summary.discount).toBe(200);
      expect(summary.total).toBe(799);

      // Remove coupon
      cart.removeCoupon();
      summary = useCartStore.getState().getSummary();
      expect(summary.discount).toBe(0);
    });

    it('updates item quantity and removes item when quantity reaches zero', () => {
      const cart = useCartStore.getState();
      cart.addItem(mockProduct, mockVariant, 1);
      const itemId = useCartStore.getState().items[0].cart_item_id;

      cart.updateQuantity(itemId, 3);
      expect(useCartStore.getState().items[0].quantity).toBe(3);

      cart.updateQuantity(itemId, 0);
      expect(useCartStore.getState().items.length).toBe(0);
    });
  });

  describe('Wishlist Store Operations', () => {
    it('toggles product in and out of wishlist', () => {
      const wishlist = useWishlistStore.getState();
      expect(wishlist.isInWishlist(mockProduct.product_id)).toBe(false);

      wishlist.toggleItem(mockProduct);
      expect(useWishlistStore.getState().isInWishlist(mockProduct.product_id)).toBe(true);

      wishlist.toggleItem(mockProduct);
      expect(useWishlistStore.getState().isInWishlist(mockProduct.product_id)).toBe(false);
    });

    it('removes item directly by product_id', () => {
      const wishlist = useWishlistStore.getState();
      wishlist.addItem(mockProduct);
      expect(useWishlistStore.getState().items.length).toBe(1);

      wishlist.removeItem(mockProduct.product_id);
      expect(useWishlistStore.getState().items.length).toBe(0);
    });
  });
});
