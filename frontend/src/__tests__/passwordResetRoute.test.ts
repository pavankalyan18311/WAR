// @vitest-environment node
/**
 * Forgot-password must not reveal whether an email has an account (attackers use that to build
 * phishing lists), and must not pass raw auth-server errors back to the browser.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const profile = { data: null as null | { id: string } }
const resetPasswordForEmail = vi.fn()
const signInWithOtp = vi.fn()
const verifyOtp = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => profile }) }) }),
    auth: { resetPasswordForEmail, signInWithOtp, verifyOtp, admin: { updateUserById: vi.fn() } },
  }),
}))

const call = async (body: unknown) => {
  const { POST } = await import('@/app/api/auth/password-reset/route')
  return POST(new Request('http://x', { method: 'POST', headers: { 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 250)}` }, body: JSON.stringify(body) }))
}

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key-long-enough-to-count-as-configured')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key')
  resetPasswordForEmail.mockReset().mockResolvedValue({ error: null })
  signInWithOtp.mockReset().mockResolvedValue({ error: null })
  verifyOtp.mockReset()
  profile.data = null
})

describe('POST /api/auth/password-reset', () => {
  it('answers an unknown email exactly like a known one, without sending anything', async () => {
    const unknown = await call({ action: 'send', email: 'nobody@example.com' })
    profile.data = { id: 'u1' }
    const known = await call({ action: 'send', email: 'someone@example.com' })

    expect(unknown.status).toBe(200)
    expect(known.status).toBe(200)
    expect(await unknown.json()).toEqual(await known.json())
    expect(resetPasswordForEmail).toHaveBeenCalledTimes(1)
    expect(resetPasswordForEmail).toHaveBeenCalledWith('someone@example.com')
  })

  it('does not pass raw auth-server errors to the browser when the code is wrong', async () => {
    verifyOtp.mockResolvedValue({ data: null, error: { message: 'Token has expired or is invalid (internal: otp_expired, user 42)' } })
    const res = await call({ action: 'verify', email: 'someone@example.com', token: '123456', password: 'longenough1' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('That code is wrong or has expired. Please request a new one.')
  })
})
