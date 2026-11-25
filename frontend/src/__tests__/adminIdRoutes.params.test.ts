import { beforeEach, describe, expect, it, vi } from 'vitest';

const eq = vi.fn();
const query = {
  update: vi.fn(() => query),
  delete: vi.fn(() => query),
  eq: vi.fn((col: string, val: string) => {
    eq(col, val);
    return query;
  }),
  select: vi.fn(() => query),
  single: vi.fn(async () => ({ data: { id: 'abc' }, error: null })),
  then: (resolve: (v: unknown) => void) => resolve({ error: null }),
};

vi.mock('@/lib/apiAuth', () => ({
  requireAdmin: async () => ({ user: { id: 'admin-1' }, response: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: () => query }),
}));

const ctx = { params: Promise.resolve({ id: 'abc' }) };
const patchReq = () =>
  new Request('http://x', { method: 'PATCH', body: JSON.stringify({ is_active: false }) });

describe('admin [id] routes read the awaited params', () => {
  beforeEach(() => eq.mockClear());

  it('coupons PATCH and DELETE target the id from params', async () => {
    const { PATCH, DELETE } = await import('@/app/api/admin/coupons/[id]/route');
    await PATCH(patchReq() as any, ctx);
    await DELETE(new Request('http://x') as any, ctx);
    expect(eq.mock.calls).toEqual([['id', 'abc'], ['id', 'abc']]);
  });

  it('collections PATCH and DELETE target the id from params', async () => {
    const { PATCH, DELETE } = await import('@/app/api/admin/collections/[id]/route');
    await PATCH(patchReq() as any, ctx);
    await DELETE(new Request('http://x') as any, ctx);
    expect(eq.mock.calls).toEqual([['id', 'abc'], ['id', 'abc']]);
  });
});
