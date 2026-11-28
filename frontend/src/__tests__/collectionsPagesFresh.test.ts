// @vitest-environment node
/**
 * Collections are managed in admin, so their pages must be rendered from live data on each visit.
 * (When they were pre-built, the build froze "No collections found" and every collection link 404'd.)
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/queries', () => ({ getCollections: vi.fn(async () => []), getProducts: vi.fn(async () => []) }))

describe('collection pages', () => {
  it('/collections is rendered fresh on every visit', async () => {
    const mod = await import('@/app/collections/page')
    expect(mod.dynamic).toBe('force-dynamic')
  })

  it('/collections/[slug] is rendered fresh and not pre-built from a frozen list', async () => {
    const mod: Record<string, unknown> = await import('@/app/collections/[slug]/page')
    expect(mod.dynamic).toBe('force-dynamic')
    expect(mod.generateStaticParams).toBeUndefined()
  })
})
