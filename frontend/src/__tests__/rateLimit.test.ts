// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import { rateLimit, clientIp, resetRateLimits } from '@/lib/rateLimit'

const req = (ip?: string) => new Request('http://x/api', { headers: ip ? { 'x-forwarded-for': `${ip}, 10.0.0.1` } : {} })
const rule = { limit: 3, windowMs: 60_000 }

afterEach(() => { resetRateLimits(); vi.useRealTimers() })

describe('clientIp', () => {
  it('uses the first address in x-forwarded-for (the visitor, not the proxy)', () => {
    expect(clientIp(req('1.2.3.4'))).toBe('1.2.3.4')
  })
  it('falls back to x-real-ip, then "unknown"', () => {
    expect(clientIp(new Request('http://x', { headers: { 'x-real-ip': '5.6.7.8' } }))).toBe('5.6.7.8')
    expect(clientIp(req())).toBe('unknown')
  })
})

describe('rateLimit', () => {
  it('lets requests through up to the limit, then answers 429 with Retry-After', async () => {
    for (let i = 0; i < 3; i++) expect(rateLimit(req('1.1.1.1'), 'contact', rule)).toBeNull()
    const blocked = rateLimit(req('1.1.1.1'), 'contact', rule)
    expect(blocked?.status).toBe(429)
    expect(Number(blocked?.headers.get('Retry-After'))).toBeGreaterThan(0)
    expect((await blocked!.json()).error).toMatch(/too many/i)
  })

  it('counts each visitor and each form separately', () => {
    for (let i = 0; i < 3; i++) rateLimit(req('1.1.1.1'), 'contact', rule)
    expect(rateLimit(req('2.2.2.2'), 'contact', rule)).toBeNull()
    expect(rateLimit(req('1.1.1.1'), 'newsletter', rule)).toBeNull()
  })

  it('opens up again once the window has passed', () => {
    vi.useFakeTimers()
    for (let i = 0; i < 4; i++) rateLimit(req('1.1.1.1'), 'contact', rule)
    vi.advanceTimersByTime(60_001)
    expect(rateLimit(req('1.1.1.1'), 'contact', rule)).toBeNull()
  })

  it('can also limit by another key, e.g. the email being reset', () => {
    for (let i = 0; i < 3; i++) rateLimit(req(`9.9.9.${i}`), 'reset', rule, 'victim@example.com')
    expect(rateLimit(req('9.9.9.9'), 'reset', rule, 'victim@example.com')?.status).toBe(429)
  })
})
