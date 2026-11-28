// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'

const load = async (env: string) => {
  vi.resetModules()
  vi.stubEnv('NODE_ENV', env)
  return (await import('../../next.config')).default
}
afterEach(() => vi.unstubAllEnvs())

describe('next.config security', () => {
  it('sends security headers on every page', async () => {
    const config = await load('production')
    const rules = await config.headers!()
    const all = rules.find((r) => r.source === '/:path*')
    const h = Object.fromEntries((all?.headers ?? []).map((x) => [x.key.toLowerCase(), x.value]))
    expect(h['x-frame-options']).toBe('SAMEORIGIN')
    expect(h['content-security-policy']).toMatch(/frame-ancestors 'self'/)
    expect(h['x-content-type-options']).toBe('nosniff')
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(h['strict-transport-security']).toMatch(/max-age=\d{7,}/)
    expect(h['permissions-policy']).toMatch(/camera=\(\)/)
  })

  it('does not advertise the framework', async () => {
    expect((await load('production')).poweredByHeader).toBe(false)
  })

  it('in production, only optimises images from https hosts we use (no localhost / plain http)', async () => {
    const patterns = (await load('production')).images?.remotePatterns ?? []
    for (const p of patterns) {
      const pattern = p as { protocol?: string; hostname: string }
      expect(pattern.protocol).toBe('https')
      expect(pattern.hostname).not.toMatch(/localhost|127\.0\.0\.1|^backend$|trycloudflare|pravatar/)
    }
  })

  it('keeps local image hosts available during development', async () => {
    const patterns = ((await load('development')).images?.remotePatterns ?? []) as Array<{ hostname: string }>
    expect(patterns.some((p) => p.hostname === 'localhost')).toBe(true)
  })
})
