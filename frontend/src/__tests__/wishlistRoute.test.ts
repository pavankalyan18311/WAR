// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let signedIn: { id: string } | null = { id: 'me' };
vi.mock('@/lib/apiAuth', () => ({
  requireUser: async () => (signedIn ? { user: signedIn, response: null }
    : { user: null, response: NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 }) }),
}));

type Row = { user_id: string; product_id: string };
let rows: Row[];
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => {
      const filters: [keyof Row, string][] = [];
      let op: 'select' | 'delete' = 'select';
      const matching = () => rows.filter((r) => filters.every(([k, v]) => r[k] === v));
      const b: any = {
        select: () => b,
        eq: (k: keyof Row, v: string) => { filters.push([k, v]); return b; },
        delete: () => { op = 'delete'; return b; },
        upsert: async (list: Row[]) => {
          for (const r of list) if (!rows.some((x) => x.user_id === r.user_id && x.product_id === r.product_id)) rows.push(r);
          return { error: null };
        },
        then: (resolve: any) => {
          if (op === 'delete') rows = rows.filter((r) => !matching().includes(r));
          return resolve({ data: matching(), error: null });
        },
      };
      return b;
    },
  }),
}));

const route = () => import('@/app/api/wishlist/route');
const req = (method: string, body?: unknown, qs = '') =>
  new Request(`http://x/api/wishlist${qs}`, { method, body: body ? JSON.stringify(body) : undefined });

describe('/api/wishlist', () => {
  beforeEach(() => {
    signedIn = { id: 'me' };
    rows = [{ user_id: 'me', product_id: 'p1' }, { user_id: 'someone-else', product_id: 'p9' }];
  });

  it('requires sign-in', async () => {
    signedIn = null;
    expect((await (await route()).GET()).status).toBe(401);
    expect((await (await route()).POST(req('POST', { product_ids: ['p2'] }))).status).toBe(401);
  });

  it('lists only my saved products', async () => {
    expect(await (await (await route()).GET()).json()).toEqual({ product_ids: ['p1'] });
  });

  it('adds products (duplicates ignored) and always for the signed-in user', async () => {
    const res = await (await route()).POST(req('POST', { product_ids: ['p1', 'p2'], user_id: 'someone-else' }));
    expect(res.status).toBe(200);
    expect(rows.filter((r) => r.user_id === 'me').map((r) => r.product_id)).toEqual(['p1', 'p2']);
    expect(rows.filter((r) => r.user_id === 'someone-else')).toHaveLength(1);
  });

  it('rejects a bad body', async () => {
    expect((await (await route()).POST(req('POST', { product_ids: 'p1' }))).status).toBe(400);
  });

  it('removes only my row', async () => {
    rows.push({ user_id: 'someone-else', product_id: 'p1' });
    await (await route()).DELETE(req('DELETE', undefined, '?product_id=p1'));
    expect(rows).toEqual([{ user_id: 'someone-else', product_id: 'p9' }, { user_id: 'someone-else', product_id: 'p1' }]);
  });
});
