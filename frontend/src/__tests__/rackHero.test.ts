import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, it, expect } from 'vitest'
import { RACK_TEES, getInitialIndex, nextIndex, prevIndex, type RackTee } from '@/lib/rackHero'

const tee = (id: string, featured = false): RackTee => ({
  id,
  name: id,
  price: 999,
  front: `/images/rack/${id}-front.jpg`,
  back: `/images/rack/${id}-back.jpg`,
  href: '/products',
  featured,
})

describe('RACK_TEES config', () => {
  it('has 5 tees', () => {
    expect(RACK_TEES).toHaveLength(5)
  })

  it('has exactly one featured tee, and it is the green Zoro tee', () => {
    const featured = RACK_TEES.filter((t) => t.featured)
    expect(featured).toHaveLength(1)
    expect(featured[0].id).toBe('zoro-green')
  })

  it('places the featured tee in the middle of the rail', () => {
    expect(RACK_TEES[2].id).toBe('zoro-green')
  })

  it('gives every tee a front image, back image, name, price and link', () => {
    for (const t of RACK_TEES) {
      expect(t.front).toMatch(/^\/images\/rack\/.+\.jpg$/)
      expect(t.back).toMatch(/^\/images\/rack\/.+\.jpg$/)
      expect(t.name.length).toBeGreaterThan(0)
      expect(t.price).toBeGreaterThan(0)
      expect(t.href.startsWith('/')).toBe(true)
    }
  })
})

describe('getInitialIndex', () => {
  it('returns the index of the featured tee', () => {
    expect(getInitialIndex([tee('a'), tee('b', true), tee('c')])).toBe(1)
  })

  it('returns 0 when no tee is featured', () => {
    expect(getInitialIndex([tee('a'), tee('b')])).toBe(0)
  })
})

describe('nextIndex / prevIndex', () => {
  it('moves forward and wraps from the last tee to the first', () => {
    expect(nextIndex(0, 5)).toBe(1)
    expect(nextIndex(4, 5)).toBe(0)
  })

  it('moves backward and wraps from the first tee to the last', () => {
    expect(prevIndex(3, 5)).toBe(2)
    expect(prevIndex(0, 5)).toBe(4)
  })

  it('stays at 0 for a single tee', () => {
    expect(nextIndex(0, 1)).toBe(0)
    expect(prevIndex(0, 1)).toBe(0)
  })
})

import { RackHeroError, parseRackTeeInput, rowToRackTee, loadRackTees } from '@/lib/rackHero'

describe('parseRackTeeInput', () => {
  const valid = { name: '  Three Sword Jersey ', price: '1799', front_url: 'https://abc.supabase.co/f.jpg', back_url: 'https://abc.supabase.co/b.jpg', link_url: '/products/zoro' }

  it('trims and normalises a valid tee', () => {
    expect(parseRackTeeInput(valid)).toEqual({
      name: 'Three Sword Jersey', price: 1799, front_url: 'https://abc.supabase.co/f.jpg',
      back_url: 'https://abc.supabase.co/b.jpg', link_url: '/products/zoro',
    })
  })

  it('accepts built-in /images/ photos and makes back photo and link optional', () => {
    expect(parseRackTeeInput({ name: 'A', price: 999, front_url: '/images/rack/a.jpg', back_url: '', link_url: '' }))
      .toEqual({ name: 'A', price: 999, front_url: '/images/rack/a.jpg', back_url: null, link_url: null })
  })

  it.each([
    [{ ...valid, name: '' }, /name/i],
    [{ ...valid, name: 'x'.repeat(41) }, /40/],
    [{ ...valid, price: 0 }, /price/i],
    [{ ...valid, price: 'abc' }, /price/i],
    [{ ...valid, front_url: '' }, /front photo/i],
    [{ ...valid, front_url: 'http://evil.com/x.jpg' }, /front photo/i],
    [{ ...valid, back_url: 'javascript:alert(1)' }, /back photo/i],
    [{ ...valid, link_url: 'https://evil.com' }, /link/i],
    [{ ...valid, link_url: '//evil.com' }, /link/i],
  ])('rejects bad input %#', (body, msg) => {
    expect(() => parseRackTeeInput(body)).toThrow(RackHeroError)
    expect(() => parseRackTeeInput(body)).toThrow(msg)
  })
})

describe('rowToRackTee', () => {
  it('maps a database row to what the rack shows', () => {
    expect(rowToRackTee({ id: 't1', name: 'A', price: '1499.00', front_url: '/f.jpg', back_url: '/b.jpg', link_url: '/products/a', is_featured: true }))
      .toEqual({ id: 't1', name: 'A', price: 1499, front: '/f.jpg', back: '/b.jpg', href: '/products/a', featured: true })
  })

  it('links to all products and has no back when those are empty', () => {
    expect(rowToRackTee({ id: 't1', name: 'A', price: 999, front_url: '/f.jpg', back_url: null, link_url: null, is_featured: false }))
      .toEqual({ id: 't1', name: 'A', price: 999, front: '/f.jpg', back: undefined, href: '/products', featured: false })
  })
})

describe('loadRackTees', () => {
  const client = (result: { data: unknown; error: unknown }) => {
    const calls: unknown[][] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable fake query builder
    const b: any = {
      select: (...a: unknown[]) => { calls.push(['select', ...a]); return b },
      eq: (...a: unknown[]) => { calls.push(['eq', ...a]); return b },
      order: (...a: unknown[]) => { calls.push(['order', ...a]); return b },
      limit: (...a: unknown[]) => { calls.push(['limit', ...a]); return Promise.resolve(result) },
    }
    return { from: (t: string) => { calls.push(['from', t]); return b }, calls }
  }

  it('loads active tees in order from home_rack_tees', async () => {
    const c = client({ data: [{ id: 't1', name: 'A', price: 999, front_url: '/f.jpg', back_url: null, link_url: null, is_featured: true }], error: null })
    const tees = await loadRackTees(c as unknown as SupabaseClient)
    expect(tees.map((t) => t.name)).toEqual(['A'])
    expect(c.calls).toContainEqual(['from', 'home_rack_tees'])
    expect(c.calls).toContainEqual(['eq', 'is_active', true])
  })

  it('returns an empty rack when every tee is hidden', async () => {
    expect(await loadRackTees(client({ data: [], error: null }) as unknown as SupabaseClient)).toEqual([])
  })

  it('falls back to the built-in tees before the migration is run', async () => {
    expect(await loadRackTees(client({ data: null, error: { message: 'relation does not exist' } }) as unknown as SupabaseClient)).toEqual(RACK_TEES)
  })
})
