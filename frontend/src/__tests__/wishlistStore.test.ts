import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useWishlistStore } from '@/store/wishlistStore'
import type { Product } from '@/types'

const mockProduct: Product = {
  product_id: 'prod-001',
  sku: 'TEST-BLK',
  name: 'Shadow Black Oversized Tee',
  slug: 'shadow-black-oversized',
  description: 'A test product',
  price: 1299,
  discount_price: 899,
  category_id: 1,
  status: 'active',
  images: [{ url: 'https://images.unsplash.com/test.jpg', alt: 'Test', type: 'image' }],
}

const mockProduct2: Product = {
  ...mockProduct,
  product_id: 'prod-002',
  name: 'Mocha Brown Oversized Tee',
  slug: 'mocha-brown-oversized',
}

// Reset global Zustand store state before each test
beforeEach(() => {
  useWishlistStore.setState({ items: [] })
})

describe('Wishlist Store — addItem / removeItem', () => {
  it('adds a product to the wishlist', () => {
    const { result } = renderHook(() => useWishlistStore())
    act(() => result.current.addItem(mockProduct))
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].product.name).toBe('Shadow Black Oversized Tee')
  })

  it('removes a product from the wishlist', () => {
    const { result } = renderHook(() => useWishlistStore())
    act(() => result.current.addItem(mockProduct))
    act(() => result.current.removeItem('prod-001'))
    expect(result.current.items).toHaveLength(0)
  })

  it('does not add duplicate products', () => {
    const { result } = renderHook(() => useWishlistStore())
    act(() => result.current.addItem(mockProduct))
    act(() => result.current.addItem(mockProduct))
    expect(result.current.items).toHaveLength(1)
  })
})

describe('Wishlist Store — isInWishlist', () => {
  it('returns true when product is in the wishlist', () => {
    const { result } = renderHook(() => useWishlistStore())
    act(() => result.current.addItem(mockProduct))
    expect(result.current.isInWishlist('prod-001')).toBe(true)
  })

  it('returns false when product is not in the wishlist', () => {
    const { result } = renderHook(() => useWishlistStore())
    expect(result.current.isInWishlist('prod-999')).toBe(false)
  })
})

describe('Wishlist Store — toggleItem', () => {
  it('adds the product if not already in wishlist', () => {
    const { result } = renderHook(() => useWishlistStore())
    act(() => result.current.toggleItem(mockProduct))
    expect(result.current.isInWishlist('prod-001')).toBe(true)
  })

  it('removes the product if already in wishlist', () => {
    const { result } = renderHook(() => useWishlistStore())
    act(() => result.current.addItem(mockProduct))
    act(() => result.current.toggleItem(mockProduct))
    expect(result.current.isInWishlist('prod-001')).toBe(false)
  })
})

describe('Wishlist Store — getTotalItems', () => {
  it('returns 0 for empty wishlist', () => {
    const { result } = renderHook(() => useWishlistStore())
    expect(result.current.getTotalItems()).toBe(0)
  })

  it('returns correct count after adding items', () => {
    const { result } = renderHook(() => useWishlistStore())
    act(() => result.current.addItem(mockProduct))
    act(() => result.current.addItem(mockProduct2))
    expect(result.current.getTotalItems()).toBe(2)
  })
})

