// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let isAdmin = true;
vi.mock('@/lib/apiAuth', () => ({
  requireAdmin: async () =>
    isAdmin ? { user: { id: 'admin' }, response: null }
      : { user: null, response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) },
}));

const writes: { op: string; row?: any; filter?: any }[] = [];
const rows = [
  { id: 'o1', attribute: 'fit', value: 'Regular', sort_order: 2 },
  { id: 'o2', attribute: 'fit', value: 'Oversized', sort_order: 1 },
  { id: 'o3', attribute: 'fabric', value: '100% Cotton', sort_order: 1 },
];
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => {
      const b: any = {
        select: () => b, order: () => b,
        upsert: (row: any) => { writes.push({ op: 'upsert', row }); return Promise.resolve({ error: null }); },
        delete: () => { writes.push({ op: 'delete' }); return b; },
        eq: (k: string, v: string) => { writes.at(-1)!.filter = { [k]: v }; return b; },
        then: (r: any) => r({ data: rows, error: null }),
      };
      return b;
    },
  }),
}));

const route = () => import('@/app/api/admin/product-options/route');
const post = (body: any) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) });

beforeEach(() => { writes.length = 0; isAdmin = true; });

describe('/api/admin/product-options', () => {
  it('is admin-only', async () => {
    isAdmin = false;
    expect((await (await route()).GET()).status).toBe(403);
  });

  it('GET groups options by attribute, in display order', async () => {
    const body = await (await (await route()).GET()).json();
    expect(body.options.fit.map((o: any) => o.value)).toEqual(['Oversized', 'Regular']);
    expect(body.options.fabric[0].value).toBe('100% Cotton');
    expect(body.options.gender).toEqual([]);
  });

  it('POST adds a tidy option (trimmed, single spaces, capitalised)', async () => {
    const res = await (await route()).POST(post({ attribute: 'fabric', value: '  bamboo   cotton ' }));
    expect(res.status).toBe(200);
    expect(writes[0].row).toMatchObject({ attribute: 'fabric', value: 'Bamboo Cotton' });
  });

  it.each([[{ attribute: 'brand', value: 'X' }], [{ attribute: 'fit', value: '   ' }], [{ attribute: 'fit', value: 'x'.repeat(61) }]])(
    'POST rejects invalid input %#', async (body) => {
      expect((await (await route()).POST(post(body))).status).toBe(400);
      expect(writes).toHaveLength(0);
    });

  it('DELETE removes one option', async () => {
    const res = await (await route()).DELETE(new Request('http://x/api/admin/product-options?id=o1', { method: 'DELETE' }));
    expect(res.status).toBe(200);
    expect(writes[0]).toMatchObject({ op: 'delete', filter: { id: 'o1' } });
  });
});
