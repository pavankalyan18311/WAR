import { describe, it, expect, beforeEach } from 'vitest'
import { useWishlistStore } from '@/store/wishlistStore'
import type { Product } from '@/types'

const mockProduct: Product = {
  product_id: 'prod-001',
  id: 'prod-001',
  sku: 'TEST-BLK',
  name: 'Shadow Black Oversized Tee',
  slug: 'shadow-black-oversized',
  description: 'A test product',
  price: 1299,
  discount_price: 899,
  category_id: 'cat-1',
  status: 'active',
  images: [{ url: 'https://example.com/test.jpg', alt: 'Test', type: 'image' }],
}

const mockProduct2: Product = {
  ...mockProduct,
  product_id: 'prod-002',
  id: 'prod-002',
  name: 'Mocha Brown Oversized Tee',
  slug: 'mocha-brown-oversized',
}

// Guest (no userId) calls stay local, so no Supabase mock is needed.
const store = () => useWishlistStore.getState()

beforeEach(() => {
  useWishlistStore.setState({ items: [] })
})

describe('Wishlist Store — addItem / removeItem', () => {
  it('adds a product to the wishlist', async () => {
    await store().addItem(mockProduct)
    expect(store().items).toHaveLength(1)
    expect(store().items[0].product.name).toBe('Shadow Black Oversized Tee')
  })

  it('removes a product from the wishlist', async () => {
    await store().addItem(mockProduct)
    await store().removeItem('prod-001')
    expect(store().items).toHaveLength(0)
  })

  it('does not add duplicate products', async () => {
    await store().addItem(mockProduct)
    await store().addItem(mockProduct)
    expect(store().items).toHaveLength(1)
  })
})

describe('Wishlist Store — isInWishlist', () => {
  it('returns true when product is in the wishlist', async () => {
    await store().addItem(mockProduct)
    expect(store().isInWishlist('prod-001')).toBe(true)
  })

  it('returns false when product is not in the wishlist', () => {
    expect(store().isInWishlist('prod-999')).toBe(false)
  })
})

describe('Wishlist Store — toggleItem', () => {
  it('adds the product if not already in wishlist', async () => {
    await store().toggleItem(mockProduct)
    expect(store().isInWishlist('prod-001')).toBe(true)
  })

  it('removes the product if already in wishlist', async () => {
    await store().addItem(mockProduct)
    await store().toggleItem(mockProduct)
    expect(store().isInWishlist('prod-001')).toBe(false)
  })
})

describe('Wishlist Store — getTotalItems', () => {
  it('returns 0 for empty wishlist', () => {
    expect(store().getTotalItems()).toBe(0)
  })

  it('returns correct count after adding items', async () => {
    await store().addItem(mockProduct)
    await store().addItem(mockProduct2)
    expect(store().getTotalItems()).toBe(2)
  })
})
