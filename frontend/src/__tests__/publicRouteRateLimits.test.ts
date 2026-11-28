// @vitest-environment node
/**
 * Every public form / look-up endpoint must refuse a visitor who has used up their attempts
 * — with a 429, before it touches the database, sends an email or calls a paid outside API.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { rateLimit, resetRateLimits, RATE, type RateRule } from '@/lib/rateLimit'

const touched = vi.fn()
const boom = () => { touched(); throw new Error('should not be reached') }

vi.mock('@/lib/admin/routeHelpers', () => ({ getServiceClient: boom }))
vi.mock('@/lib/supabase/server', () => ({ createClient: boom, createAdminClient: boom }))
vi.mock('@supabase/supabase-js', () => ({ createClient: boom }))
vi.mock('@/lib/apiAuth', () => ({ requireUser: async () => ({ user: { id: 'u1', email: 'u1@example.com' }, response: null }) }))
vi.mock('@/lib/geo', () => ({ lookupPincode: boom, reverseGeocode: boom }))
vi.mock('@/lib/shiprocket', () => ({ checkPincodeServiceability: boom }))
vi.mock('@/lib/email/marketing', () => ({ addToMarketingList: boom }))

const IP = '203.0.113.7'
const post = (body: unknown) => new Request('http://x/api', { method: 'POST', headers: { 'x-forwarded-for': IP, 'content-type': 'application/json' }, body: JSON.stringify(body) })
const get = (qs: string) => new Request(`http://x/api?${qs}`, { headers: { 'x-forwarded-for': IP } })
const useUp = (bucket: string, rule: RateRule) => { for (let i = 0; i < rule.limit; i++) rateLimit(get(''), bucket, rule) }

beforeEach(() => { resetRateLimits(); touched.mockClear() })

const cases: Array<[string, string, RateRule, () => Promise<Response>]> = [
  ['contact form', 'contact', RATE.form, async () => (await import('@/app/api/contact/route')).POST(post({ name: 'A', email: 'a@b.co', message: 'hello there friend' }))],
  ['newsletter', 'newsletter', RATE.form, async () => (await import('@/app/api/newsletter/route')).POST(post({ email: 'a@b.co' }))],
  ['back-in-stock alert', 'stock-alert', RATE.form, async () => (await import('@/app/api/stock-alerts/route')).POST(post({ variant_id: 'v1', email: 'a@b.co' }))],
  ['product review', 'review', RATE.form, async () => (await import('@/app/api/products/[id]/reviews/route')).POST(post({ rating: 5 }), { params: Promise.resolve({ id: 'p1' }) })],
  ['coupon check', 'coupon', RATE.lookup, async () => (await import('@/app/api/coupons/validate/route')).POST(post({ code: 'SAVE10', subtotal: 1000 }))],
  ['pincode look-up', 'lookup', RATE.lookup, async () => (await import('@/app/api/geo/pincode/route')).GET(get('pincode=500001'))],
  ['reverse geocode', 'lookup', RATE.lookup, async () => (await import('@/app/api/geo/reverse/route')).GET(get('lat=17.4&lng=78.4'))],
  ['delivery check', 'lookup', RATE.lookup, async () => (await import('@/app/api/shipping/serviceability/route')).POST(post({ pincode: '500001' }))],
  ['password reset email', 'reset-send', RATE.email, async () => (await import('@/app/api/auth/password-reset/route')).POST(post({ action: 'send', email: 'a@b.co' }))],
  ['password reset code', 'reset-verify', RATE.verify, async () => (await import('@/app/api/auth/password-reset/route')).POST(post({ action: 'verify', email: 'a@b.co', token: '123456', password: 'longenough1' }))],
]

describe('public endpoints are rate limited', () => {
  it.each(cases)('%s answers 429 once the visitor is out of attempts', async (_name, bucket, rule, call) => {
    useUp(bucket, rule)
    const res = await call()
    expect(res.status).toBe(429)
    expect(touched).not.toHaveBeenCalled()
  })

  it('search is limited too', async () => {
    useUp('search', RATE.search)
    const res = await (await import('@/app/api/search/route')).GET(get('q=zoro'))
    expect(res.status).toBe(429)
  })

  it('password reset emails are also limited per email address, whatever the IP', async () => {
    for (let i = 0; i < RATE.email.limit; i++) rateLimit(get(''), 'reset-send-email', RATE.email, 'victim@example.com')
    const req = new Request('http://x/api', { method: 'POST', headers: { 'x-forwarded-for': '198.51.100.1' }, body: JSON.stringify({ action: 'send', email: 'Victim@Example.com' }) })
    const res = await (await import('@/app/api/auth/password-reset/route')).POST(req)
    expect(res.status).toBe(429)
  })
})
