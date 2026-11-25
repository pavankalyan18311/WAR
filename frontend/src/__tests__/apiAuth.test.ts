import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAdmin, requireUser } from '@/lib/apiAuth';

const getUser = vi.fn();
const profileSingle = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser } }),
  createAdminClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: profileSingle }) }) }),
  }),
}));

const signedIn = (id = 'u1') => getUser.mockResolvedValue({ data: { user: { id, email: 'a@b.c' } }, error: null });

describe('requireUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a 401 response when nobody is signed in', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await requireUser();
    expect(result.user).toBeNull();
    expect(result.response?.status).toBe(401);
  });

  it('returns the signed-in user', async () => {
    signedIn('u1');
    const result = await requireUser();
    expect(result.user?.id).toBe('u1');
    expect(result.response).toBeNull();
  });
});

describe('requireAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when nobody is signed in', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await requireAdmin()).response?.status).toBe(401);
  });

  it('returns 403 for a signed-in customer', async () => {
    signedIn();
    profileSingle.mockResolvedValue({ data: { role: 'customer' }, error: null });
    const result = await requireAdmin();
    expect(result.user).toBeNull();
    expect(result.response?.status).toBe(403);
  });

  it.each(['admin', 'super_admin'])('allows role %s', async (role) => {
    signedIn('admin-1');
    profileSingle.mockResolvedValue({ data: { role }, error: null });
    const result = await requireAdmin();
    expect(result.user?.id).toBe('admin-1');
    expect(result.response).toBeNull();
  });
});
