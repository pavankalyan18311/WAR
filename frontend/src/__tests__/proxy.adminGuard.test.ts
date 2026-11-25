import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

let user: { id: string } | null = null;
let role: string | null = null;
let profileThrows = false;

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => {
            if (profileThrows) throw new Error('db down');
            return { data: role ? { role } : null };
          },
        }),
      }),
    }),
  }),
}));

const run = async (path: string) => {
  const { proxy } = await import('@/proxy');
  return proxy(new NextRequest(`http://localhost${path}`));
};
const isRedirectToLogin = (res: Response) =>
  res.status === 307 && (res.headers.get('location') ?? '').includes('/admin/login');

describe('proxy admin guard', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    user = null; role = null; profileThrows = false;
  });
  afterEach(() => vi.unstubAllEnvs());

  it('redirects signed-out visitors away from admin pages', async () => {
    expect(isRedirectToLogin(await run('/admin/dashboard'))).toBe(true);
  });

  it('redirects signed-in customers away from admin pages', async () => {
    user = { id: 'u1' }; role = 'customer';
    expect(isRedirectToLogin(await run('/admin/orders'))).toBe(true);
  });

  it('lets admins through', async () => {
    user = { id: 'u1' }; role = 'admin';
    expect(isRedirectToLogin(await run('/admin/orders'))).toBe(false);
  });

  it('fails closed when the role lookup errors', async () => {
    user = { id: 'u1' }; profileThrows = true;
    expect(isRedirectToLogin(await run('/admin/orders'))).toBe(true);
  });

  it('ignores the auth-bypass switch in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DISABLE_SUPABASE_AUTH', 'true');
    vi.stubEnv('NEXT_PUBLIC_DISABLE_SUPABASE_AUTH', 'true');
    expect(isRedirectToLogin(await run('/admin/dashboard'))).toBe(true);
  });

  it('does not block normal shop pages', async () => {
    expect(isRedirectToLogin(await run('/products'))).toBe(false);
  });
});
