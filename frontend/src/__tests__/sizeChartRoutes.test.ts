// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let isAdmin = true;
vi.mock('@/lib/apiAuth', () => ({
  requireAdmin: async () => (isAdmin ? { user: { id: 'admin' }, response: null }
    : { user: null, response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) }),
}));

type Row = Record<string, any>;
let charts: Row[];
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => {
      const filters: ((r: Row) => boolean)[] = [];
      let op: 'select' | 'update' | 'delete' | 'insert' = 'select';
      let payload: Row = {};
      const matching = () => charts.filter((r) => filters.every((f) => f(r)));
      const b: any = {
        select: () => b, order: () => b,
        eq: (k: string, v: any) => { filters.push((r) => r[k] === v); return b; },
        neq: (k: string, v: any) => { filters.push((r) => r[k] !== v); return b; },
        insert: (p: Row) => { op = 'insert'; payload = { id: `c${charts.length + 1}`, ...p }; charts.push(payload); return b; },
        update: (p: Row) => { op = 'update'; payload = p; return b; },
        delete: () => { op = 'delete'; return b; },
        single: async () => ({ data: op === 'insert' ? payload : matching()[0], error: null }),
        then: (resolve: any) => {
          if (op === 'update') matching().forEach((r) => Object.assign(r, payload));
          if (op === 'delete') charts = charts.filter((r) => !matching().includes(r));
          return resolve({ data: matching(), error: null });
        },
      };
      return b;
    },
  }),
}));

const body = (over: Row = {}) => ({
  name: 'Hoodie', unit: 'in', columns: ['Chest', 'Length'], rows: [{ size: 'M', values: ['46', '28'] }], note: '', is_default: false, ...over,
});
const req = (method: string, data?: unknown) => new Request('http://x', { method, body: data ? JSON.stringify(data) : undefined });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const publicRoute = () => import('@/app/api/size-charts/route');
const adminList = () => import('@/app/api/admin/size-charts/route');
const adminOne = () => import('@/app/api/admin/size-charts/[id]/route');

beforeEach(() => {
  isAdmin = true;
  charts = [{ id: 'c1', ...body({ name: 'Tee', is_default: true }) }];
});

describe('size chart routes', () => {
  it('anyone can read the charts', async () => {
    const res = await (await publicRoute()).GET();
    expect((await res.json()).charts.map((c: any) => c.name)).toEqual(['Tee']);
  });

  it('only admins can create, edit or delete', async () => {
    isAdmin = false;
    expect((await (await adminList()).POST(req('POST', body()))).status).toBe(403);
    expect((await (await adminOne()).PUT(req('PUT', body()), ctx('c1'))).status).toBe(403);
    expect((await (await adminOne()).DELETE(req('DELETE'), ctx('c1'))).status).toBe(403);
  });

  it('creates a chart, rejecting invalid input with a clear message', async () => {
    const bad = await (await adminList()).POST(req('POST', body({ rows: [] })));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toBe('Add at least one size.');

    const ok = await (await adminList()).POST(req('POST', body()));
    expect(ok.status).toBe(200);
    expect(charts.map((c) => c.name)).toEqual(['Tee', 'Hoodie']);
  });

  it('making a chart the default un-defaults the previous one', async () => {
    charts.push({ id: 'c2', ...body() });
    await (await adminOne()).PUT(req('PUT', body({ is_default: true })), ctx('c2'));
    expect(charts.find((c) => c.id === 'c1')!.is_default).toBe(false);
    expect(charts.find((c) => c.id === 'c2')).toMatchObject({ is_default: true, name: 'Hoodie' });
  });

  it('switches the store default from Settings (or clears it)', async () => {
    const { POST } = await import('@/app/api/admin/size-charts/default/route');
    charts.push({ id: 'c2', ...body() });
    expect((await POST(req('POST', { id: 'c2' }))).status).toBe(200);
    expect(charts.map((c) => [c.id, c.is_default])).toEqual([['c1', false], ['c2', true]]);

    expect((await POST(req('POST', { id: null }))).status).toBe(200);
    expect(charts.every((c) => !c.is_default)).toBe(true);

    expect((await POST(req('POST', { id: 'missing' }))).status).toBe(404);
    isAdmin = false;
    expect((await POST(req('POST', { id: 'c1' }))).status).toBe(403);
  });

  it('deletes a chart', async () => {
    await (await adminOne()).DELETE(req('DELETE'), ctx('c1'));
    expect(charts).toHaveLength(0);
  });
});
