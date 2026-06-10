import { describe, it, expect } from 'vitest'
import { formatPrice, calculateDiscount, slugify, truncate, cn } from '@/lib/utils'

describe('formatPrice', () => {
  it('formats a whole number with ₹ prefix', () => {
    expect(formatPrice(1299)).toBe('₹1,299')
  })

  it('formats a decimal price using locale formatting', () => {
    // toLocaleString('en-IN') for 899.5 produces ₹899.5
    expect(formatPrice(899.5)).toContain('₹')
    expect(formatPrice(899.5)).toContain('899')
  })

  it('formats zero as ₹0', () => {
    expect(formatPrice(0)).toBe('₹0')
  })

  it('formats large amounts with comma separators', () => {
    expect(formatPrice(10000)).toContain('10,000')
  })
})

describe('calculateDiscount', () => {
  it('returns correct percentage for original 1299 / discounted 899', () => {
    const pct = calculateDiscount(1299, 899)
    expect(pct).toBe(31)
  })

  it('returns 0 when no discount', () => {
    expect(calculateDiscount(999, 999)).toBe(0)
  })

  it('returns negative when discount price is higher (reflects actual behaviour)', () => {
    // The function has no guard — it returns negative for inverted prices
    const result = calculateDiscount(500, 600)
    expect(result).toBeLessThan(0)
  })

  it('returns 100 when discounted to zero', () => {
    expect(calculateDiscount(1000, 0)).toBe(100)
  })
})

describe('slugify', () => {
  it('converts spaces to hyphens', () => {
    expect(slugify('Shadow Black Oversized')).toBe('shadow-black-oversized')
  })

  it('lowercases all characters', () => {
    expect(slugify('THREADX')).toBe('threadx')
  })

  it('removes special characters', () => {
    const result = slugify("Men's T-Shirt!")
    expect(result).not.toContain("'")
    expect(result).not.toContain('!')
  })

  it('replaces spaces with hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world')
  })
})

describe('truncate', () => {
  it('returns the original string if shorter than limit', () => {
    expect(truncate('Hi', 10)).toBe('Hi')
  })

  it('truncates and appends ellipsis when over limit', () => {
    const result = truncate('This is a long description', 10)
    expect(result.endsWith('...')).toBe(true)
    expect(result.length).toBeLessThanOrEqual(13)
  })

  it('returns exact string at limit without ellipsis', () => {
    expect(truncate('Hello', 5)).toBe('Hello')
  })
})

describe('cn (classnames)', () => {
  it('joins multiple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('ignores falsy values', () => {
    expect(cn('foo', undefined, null, false, 'bar')).toBe('foo bar')
  })

  it('merges conflicting Tailwind classes (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('')
  })
})

