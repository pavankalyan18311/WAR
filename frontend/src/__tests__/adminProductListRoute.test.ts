// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let isAdmin = true;
vi.mock('@/lib/apiAuth', () => ({
  requireAdmin: async () =>
    isAdmin
      ? { user: { id: 'admin' }, response: null }
      : { user: null, response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) },
}));

const updates: any[] = [];
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: async () => ({ data: [{ product_id: 'p1', units: 3 }], error: null }),
    from: () => {
      const b: any = {
        select: () => b,
        order: () => b,
        update: (p: any) => { updates.push(p); return b; },
        eq: () => b,
        then: (r: any) => r({ data: [{ id: 'p1', name: 'Tee', slug: 'tee', status: 'active' }], error: null }),
      };
      return b;
    },
  }),
}));

const patch = (body: any) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) });
const ctx = { params: Promise.resolve({ id: 'p1' }) };

beforeEach(() => { isAdmin = true; updates.length = 0; });

describe('GET /api/admin/products', () => {
  it('is admin-only', async () => {
    isAdmin = false;
    const { GET } = await import('@/app/api/admin/products/route');
    expect((await GET()).status).toBe(403);
  });

  it('lists products with real sales', async () => {
    const { GET } = await import('@/app/api/admin/products/route');
    const body = await (await GET()).json();
    expect(body.products[0]).toMatchObject({ id: 'p1', sales: 3 });
  });
});

describe('PATCH /api/admin/products/[id]', () => {
  it('changes status (active / draft / archived)', async () => {
    const { PATCH } = await import('@/app/api/admin/products/[id]/route');
    expect((await PATCH(patch({ status: 'archived' }), ctx)).status).toBe(200);
    expect(updates[0]).toMatchObject({ status: 'archived' });
  });

  it('rejects unknown statuses', async () => {
    const { PATCH } = await import('@/app/api/admin/products/[id]/route');
    expect((await PATCH(patch({ status: 'deleted' }), ctx)).status).toBe(400);
    expect(updates).toHaveLength(0);
  });
});
