// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let sessionUser: { id: string; email: string } | null = null;
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: sessionUser } }) } }),
}));
let isAdmin = true;
vi.mock('@/lib/apiAuth', () => ({
  requireAdmin: async () => (isAdmin ? { user: { id: 'admin' }, response: null }
    : { user: null, response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) }),
}));

type Row = Record<string, any>;
let variants: Row[];
let alerts: Row[];
let upserts: Row[];

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      const filters: ((r: Row) => boolean)[] = [];
      const source = () => (table === 'product_variants' ? variants : alerts);
      const matching = () => source().filter((r) => filters.every((f) => f(r)));
      const b: any = {
        select: () => b, order: () => b,
        eq: (k: string, v: any) => { filters.push((r) => r[k] === v); return b; },
        is: (k: string, v: any) => { filters.push((r) => (r[k] ?? null) === v); return b; },
        maybeSingle: async () => ({ data: matching()[0] ?? null, error: null }),
        upsert: async (row: Row) => { upserts.push(row); return { error: null }; },
        then: (resolve: any) => resolve({ data: matching(), error: null }),
      };
      return b;
    },
  }),
}));

const post = async (body: unknown) =>
  (await import('@/app/api/stock-alerts/route')).POST(new Request('http://x', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  sessionUser = null; isAdmin = true; upserts = [];
  variants = [
    { id: 'v-out', product_id: 'p1', status: 'active', inventory: { quantity: 0, reserved_quantity: 0 } },
    { id: 'v-in', product_id: 'p1', status: 'active', inventory: { quantity: 4, reserved_quantity: 0 } },
  ];
  alerts = [
    { id: 'a1', variant_id: 'v-out', email: 'a@x.com', notified_at: null, created_at: '2026-10-01',
      variant: { size_option: { name: 'M' }, color: { name: 'Black' }, product: { name: 'Tee', slug: 'tee' } } },
    { id: 'a2', variant_id: 'v-out', email: 'b@x.com', notified_at: null, created_at: '2026-10-02',
      variant: { size_option: { name: 'M' }, color: { name: 'Black' }, product: { name: 'Tee', slug: 'tee' } } },
    { id: 'a3', variant_id: 'v-old', email: 'c@x.com', notified_at: '2026-10-03', created_at: '2026-09-01',
      variant: { size_option: { name: 'L' }, color: null, product: { name: 'Tee', slug: 'tee' } } },
  ];
});

describe('POST /api/stock-alerts', () => {
  it('saves a request for a sold-out size (email tidied, re-armed if notified before)', async () => {
    const res = await post({ variant_id: 'v-out', email: '  Asha@Example.com ' });
    expect(res.status).toBe(200);
    expect(upserts[0]).toMatchObject({ variant_id: 'v-out', product_id: 'p1', email: 'asha@example.com', notified_at: null, user_id: null });
  });

  it('links the request to the signed-in customer', async () => {
    sessionUser = { id: 'u1', email: 'u1@x.com' };
    await post({ variant_id: 'v-out', email: 'u1@x.com' });
    expect(upserts[0].user_id).toBe('u1');
  });

  it.each([
    [{ variant_id: 'v-out', email: 'not-an-email' }, 400],
    [{ email: 'a@x.com' }, 400],
    [{ variant_id: 'missing', email: 'a@x.com' }, 404],
    [{ variant_id: 'v-in', email: 'a@x.com' }, 409],
  ])('rejects %j with %i', async (body, status) => {
    expect((await post(body)).status).toBe(status);
    expect(upserts).toHaveLength(0);
  });
});

describe('GET /api/admin/stock-alerts', () => {
  const get = async () => (await import('@/app/api/admin/stock-alerts/route')).GET();

  it('is admin-only', async () => {
    isAdmin = false;
    expect((await get()).status).toBe(403);
  });

  it('groups pending requests by product and size', async () => {
    const body = await (await get()).json();
    expect(body.groups).toEqual([
      { variant_id: 'v-out', product: 'Tee', slug: 'tee', size: 'M', color: 'Black', count: 2, latest: '2026-10-02' },
    ]);
  });
});
