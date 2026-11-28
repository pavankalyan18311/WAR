// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession: async () => ({ error: null }) } }),
}))

const go = async (next: string) => {
  const { GET } = await import('@/app/auth/callback/route')
  const res = await GET(new Request(`https://war.example/auth/callback?code=abc&next=${encodeURIComponent(next)}`))
  return new URL(res.headers.get('location')!)
}

describe('GET /auth/callback', () => {
  it('sends the customer on to a page of this site', async () => {
    const to = await go('/account/orders?tab=1')
    expect(to.origin).toBe('https://war.example')
    expect(to.pathname + to.search).toBe('/account/orders?tab=1')
  })

  it.each(['@evil.com', '.evil.com', '//evil.com', 'https://evil.com', '/\\evil.com', 'javascript:alert(1)'])(
    'never redirects off-site (next=%s)', async (next) => {
      const to = await go(next)
      expect(to.origin).toBe('https://war.example')
    })
})
