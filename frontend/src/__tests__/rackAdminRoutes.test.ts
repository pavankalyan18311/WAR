// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- loose Supabase/fetch mocks, same as the other admin route tests */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let isAdmin = true;
vi.mock('@/lib/apiAuth', () => ({
  requireAdmin: async () => (isAdmin ? { user: { id: 'admin' }, response: null }
    : { user: null, response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) }),
}));

type Row = Record<string, any>;
let tees: Row[];
const removed: { bucket: string; paths: string[] }[] = [];
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    storage: { from: (bucket: string) => ({ remove: async (paths: string[]) => { removed.push({ bucket, paths }); return { error: null }; } }) },
    from: () => {
      const filters: [string, string, any][] = [];
      let op: 'select' | 'update' | 'delete' | 'insert' = 'select';
      let payload: Row = {};
      const rows = () => tees.filter((r) => filters.every(([how, k, v]) => (how === 'eq' ? r[k] === v : r[k] !== v)));
      const b: any = {
        select: () => b, order: () => b, limit: () => b,
        eq: (k: string, v: any) => { filters.push(['eq', k, v]); return b; },
        neq: (k: string, v: any) => { filters.push(['neq', k, v]); return b; },
        insert: (p: Row) => { op = 'insert'; payload = { id: `t${tees.length + 1}`, ...p }; tees.push(payload); return b; },
        update: (p: Row) => { op = 'update'; payload = p; return b; },
        delete: () => { op = 'delete'; return b; },
        maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
        single: async () => ({ data: op === 'insert' ? payload : rows()[0], error: null }),
        then: (resolve: any) => {
          const matched = rows();
          if (op === 'update') matched.forEach((r) => Object.assign(r, payload));
          if (op === 'delete') tees = tees.filter((r) => !matched.includes(r));
          return resolve({ data: matched, error: null });
        },
      };
      return b;
    },
  }),
}));

const req = (method: string, body?: unknown) => new Request('http://x', { method, body: body ? JSON.stringify(body) : undefined });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const list = () => import('@/app/api/admin/rack/route');
const one = () => import('@/app/api/admin/rack/[id]/route');

const BUCKET = 'https://abc.supabase.co/storage/v1/object/public/products/';

beforeEach(() => {
  isAdmin = true;
  removed.length = 0;
  tees = [
    { id: 't1', name: 'Ashen Halo Tee', price: 1499, front_url: '/images/rack/ashen-halo-front.jpg', back_url: null, link_url: null, sort_order: 1, is_active: true, is_featured: false },
    { id: 't2', name: 'Three Sword Jersey', price: 1799, front_url: `${BUCKET}products/f.jpg`, back_url: `${BUCKET}products/b.jpg`, link_url: null, sort_order: 2, is_active: true, is_featured: true },
  ];
});

describe('admin rack routes', () => {
  it('is admin-only', async () => {
    isAdmin = false;
    expect((await (await list()).GET()).status).toBe(403);
    expect((await (await list()).POST(req('POST', {}))).status).toBe(403);
    expect((await (await one()).PATCH(req('PATCH', {}), ctx('t1'))).status).toBe(403);
    expect((await (await one()).DELETE(req('DELETE'), ctx('t1'))).status).toBe(403);
  });

  it('lists every tee, hidden ones included', async () => {
    tees[0].is_active = false;
    const data = await (await (await list()).GET()).json();
    expect(data.tees.map((t: Row) => t.id)).toEqual(['t1', 't2']);
  });

  it('adds a tee at the end of the rail', async () => {
    const res = await (await list()).POST(req('POST', { name: 'Thunder Stripe Tee', price: 1699, front_url: `${BUCKET}products/x.jpg`, link_url: '/products/thunder' }));
    expect(res.status).toBe(200);
    const added = tees.find((t) => t.name === 'Thunder Stripe Tee')!;
    expect(added).toMatchObject({ price: 1699, back_url: null, link_url: '/products/thunder', sort_order: 3, is_active: true, is_featured: false });
  });

  it('rejects an invalid tee with a clear message', async () => {
    const res = await (await list()).POST(req('POST', { name: '', price: 1699, front_url: `${BUCKET}x.jpg` }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/name/i);
  });

  it('edits name, price, photos and link', async () => {
    const res = await (await one()).PATCH(req('PATCH', { name: 'Ashen Halo', price: '1599', back_url: `${BUCKET}products/new-back.jpg`, link_url: '/products/ashen' }), ctx('t1'));
    expect(res.status).toBe(200);
    expect(tees[0]).toMatchObject({ name: 'Ashen Halo', price: 1599, back_url: `${BUCKET}products/new-back.jpg`, link_url: '/products/ashen' });
  });

  it('rejects a bad edit', async () => {
    const res = await (await one()).PATCH(req('PATCH', { price: -5 }), ctx('t1'));
    expect(res.status).toBe(400);
    expect(tees[0].price).toBe(1499);
  });

  it('hides, reorders, and rejects an empty edit', async () => {
    await (await one()).PATCH(req('PATCH', { is_active: false, sort_order: 9 }), ctx('t1'));
    expect(tees[0]).toMatchObject({ is_active: false, sort_order: 9 });
    expect((await (await one()).PATCH(req('PATCH', {}), ctx('t1'))).status).toBe(400);
  });

  it('making a tee face forward first un-features the others', async () => {
    await (await one()).PATCH(req('PATCH', { is_featured: true }), ctx('t1'));
    expect(tees.find((t) => t.id === 't1')!.is_featured).toBe(true);
    expect(tees.find((t) => t.id === 't2')!.is_featured).toBe(false);
  });

  it('deletes a tee and removes the photos it uploaded (but not built-in ones)', async () => {
    expect((await (await one()).DELETE(req('DELETE'), ctx('t2'))).status).toBe(200);
    expect(tees.map((t) => t.id)).toEqual(['t1']);
    expect(removed).toEqual([{ bucket: 'products', paths: ['products/f.jpg', 'products/b.jpg'] }]);

    await (await one()).DELETE(req('DELETE'), ctx('t1'));
    expect(removed).toHaveLength(1);
  });
});
