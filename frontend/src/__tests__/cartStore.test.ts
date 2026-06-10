import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useCartStore } from '@/store/cartStore'
import type { Product, ProductVariant } from '@/types'

// ─── Mock data matching actual type shapes ────────────────────────────────────
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

const mockVariant: ProductVariant = {
  variant_id: 'var-001',
  product_id: 'prod-001',
  sku: 'TEST-BLK-L',
  color: 'Black',
  size: 'L',
  stock_quantity: 10,
  price_override: 899,
}

const mockVariant2: ProductVariant = {
  variant_id: 'var-002',
  product_id: 'prod-001',
  sku: 'TEST-BLK-XL',
  color: 'Black',
  size: 'XL',
  stock_quantity: 10,
  price_override: 899,
}

beforeEach(() => {
  useCartStore.setState({ items: [], couponCode: '', discount: 0 })
})

describe('Cart Store — addItem', () => {
  it('adds a new item to the cart', () => {
    const { result } = renderHook(() => useCartStore())
    act(() => result.current.addItem(mockProduct, mockVariant))
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].product.name).toBe('Shadow Black Oversized Tee')
  })

  it('increments quantity when adding the same variant twice', () => {
    const { result } = renderHook(() => useCartStore())
    act(() => result.current.addItem(mockProduct, mockVariant))
    act(() => result.current.addItem(mockProduct, mockVariant))
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].quantity).toBe(2)
  })

  it('adds different variants as separate cart items', () => {
    const { result } = renderHook(() => useCartStore())
    act(() => result.current.addItem(mockProduct, mockVariant))
    act(() => result.current.addItem(mockProduct, mockVariant2))
    expect(result.current.items).toHaveLength(2)
  })

  it('caps quantity at 5 per variant', () => {
    const { result } = renderHook(() => useCartStore())
    for (let i = 0; i < 7; i++) {
      act(() => result.current.addItem(mockProduct, mockVariant))
    }
    expect(result.current.items[0].quantity).toBe(5)
  })
})

describe('Cart Store — removeItem', () => {
  it('removes an item by cart_item_id', () => {
    const { result } = renderHook(() => useCartStore())
    act(() => result.current.addItem(mockProduct, mockVariant))
    const cartItemId = result.current.items[0].cart_item_id
    act(() => result.current.removeItem(cartItemId))
    expect(result.current.items).toHaveLength(0)
  })

  it('only removes the specified item', () => {
    const { result } = renderHook(() => useCartStore())
    act(() => result.current.addItem(mockProduct, mockVariant))
    act(() => result.current.addItem(mockProduct, mockVariant2))
    const cartItemId = result.current.items[0].cart_item_id
    act(() => result.current.removeItem(cartItemId))
    expect(result.current.items).toHaveLength(1)
  })
})

describe('Cart Store — updateQuantity', () => {
  it('updates the quantity of an item', () => {
    const { result } = renderHook(() => useCartStore())
    act(() => result.current.addItem(mockProduct, mockVariant))
    const cartItemId = result.current.items[0].cart_item_id
    act(() => result.current.updateQuantity(cartItemId, 3))
    expect(result.current.items[0].quantity).toBe(3)
  })

  it('removes item when quantity set to 0', () => {
    const { result } = renderHook(() => useCartStore())
    act(() => result.current.addItem(mockProduct, mockVariant))
    const cartItemId = result.current.items[0].cart_item_id
    act(() => result.current.updateQuantity(cartItemId, 0))
    expect(result.current.items).toHaveLength(0)
  })
})

describe('Cart Store — getSummary (pricing)', () => {
  it('calculates correct subtotal for qty=2 at price 899', () => {
    const { result } = renderHook(() => useCartStore())
    act(() => result.current.addItem(mockProduct, mockVariant, 2))
    expect(result.current.getSummary().subtotal).toBe(1798)
  })

  it('provides free shipping when subtotal >= 999', () => {
    const { result } = renderHook(() => useCartStore())
    act(() => result.current.addItem(mockProduct, mockVariant, 2)) // 1798 > 999
    expect(result.current.getSummary().shipping).toBe(0)
  })

  it('charges ₹99 shipping when subtotal < 999', () => {
    const cheapVariant: ProductVariant = { ...mockVariant, price_override: 499 }
    const { result } = renderHook(() => useCartStore())
    act(() => result.current.addItem(mockProduct, cheapVariant, 1))
    expect(result.current.getSummary().shipping).toBe(99)
  })

  it('returns 0 subtotal for empty cart', () => {
    const { result } = renderHook(() => useCartStore())
    expect(result.current.getSummary().subtotal).toBe(0)
  })
})

describe('Cart Store — clearCart', () => {
  it('empties the cart', () => {
    const { result } = renderHook(() => useCartStore())
    act(() => result.current.addItem(mockProduct, mockVariant))
    act(() => result.current.clearCart())
    expect(result.current.items).toHaveLength(0)
  })
})

describe('Cart Store — coupon application', () => {
  it('stores coupon code and discount amount', () => {
    const { result } = renderHook(() => useCartStore())
    act(() => result.current.applyCoupon('SUMMER20', 200))
    expect(result.current.couponCode).toBe('SUMMER20')
    expect(result.current.discount).toBe(200)
  })

  it('removeCoupon clears discount', () => {
    const { result } = renderHook(() => useCartStore())
    act(() => result.current.applyCoupon('SUMMER20', 200))
    act(() => result.current.removeCoupon())
    expect(result.current.discount).toBe(0)
    expect(result.current.couponCode).toBe('')
  })
})

