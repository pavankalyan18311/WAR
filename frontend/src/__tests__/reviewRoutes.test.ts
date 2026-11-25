// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let user: { id: string } | null = { id: 'u1' };
let isAdmin = false;
vi.mock('@/lib/apiAuth', () => {
  const deny = (s: number, e: string) => ({ user: null, response: NextResponse.json({ error: e }, { status: s }) });
  return {
    requireUser: async () => (user ? { user, response: null } : deny(401, 'Please sign in to continue.')),
    requireAdmin: async () => (!user ? deny(401, 'Please sign in') : isAdmin ? { user, response: null } : deny(403, 'Admin access required.')),
  };
});

let deliveredOrder: string | null = 'o1';
vi.mock('@/lib/reviews', async (orig) => ({
  ...(await orig<any>()),
  findDeliveredOrder: async () => deliveredOrder,
}));

type Row = Record<string, any>;
let reviews: Row[];
const profiles: Record<string, string> = { u1: 'Ravi Kumar', u2: 'Asha Rao' };

/** Tiny in-memory stand-in for the product_reviews table. */
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => {
      const filters: ((r: Row) => boolean)[] = [];
      let op: 'select' | 'update' | 'delete' | 'upsert' = 'select';
      let payload: Row = {};
      const matching = () => reviews.filter((r) => filters.every((f) => f(r)));
      const withProfile = (r: Row) => ({ ...r, profile: { name: profiles[r.user_id] } });
      const b: any = {
        select: () => b, order: () => b, limit: () => b,
        eq: (k: string, v: any) => { filters.push((r) => r[k] === v); return b; },
        in: (k: string, v: any[]) => { filters.push((r) => v.includes(r[k])); return b; },
        update: (p: Row) => { op = 'update'; payload = p; return b; },
        delete: () => { op = 'delete'; return b; },
        upsert: (p: Row) => {
          op = 'upsert';
          const existing = reviews.find((r) => r.product_id === p.product_id && r.user_id === p.user_id);
          if (existing) Object.assign(existing, p);
          else reviews.push({ id: `r${reviews.length + 1}`, created_at: '2026-10-09', ...p });
          return b;
        },
        maybeSingle: async () => ({ data: matching()[0] ? withProfile(matching()[0]) : null, error: null }),
        single: async () => b.maybeSingle(),
        then: (resolve: any) => {
          if (op === 'update') matching().forEach((r) => Object.assign(r, payload));
          if (op === 'delete') reviews = reviews.filter((r) => !matching().includes(r));
          return resolve({ data: matching().map(withProfile), error: null });
        },
      };
      return b;
    },
  }),
}));

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const json = (body: any) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) });
const productRoute = () => import('@/app/api/products/[id]/reviews/route');
const meRoute = () => import('@/app/api/products/[id]/reviews/me/route');
const adminList = () => import('@/app/api/admin/reviews/route');
const adminOne = () => import('@/app/api/admin/reviews/[id]/route');

beforeEach(() => {
  user = { id: 'u1' }; isAdmin = false; deliveredOrder = 'o1';
  reviews = [
    { id: 'r1', product_id: 'p1', user_id: 'u2', rating: 5, title: 'Love it', body: 'Heavy fabric, great drape.', status: 'approved', created_at: '2026-10-01' },
    { id: 'r2', product_id: 'p1', user_id: 'u3', rating: 1, title: null, body: 'Spam spam spam spam', status: 'hidden', created_at: '2026-10-02' },
    { id: 'r3', product_id: 'p1', user_id: 'u4', rating: 3, title: null, body: 'Waiting for approval', status: 'pending', created_at: '2026-10-03' },
  ];
});

describe('GET /api/products/[id]/reviews (public)', () => {
  it('lists only approved reviews, with a short author name and summary', async () => {
    const res = await (await productRoute()).GET(new Request('http://x'), ctx('p1'));
    const body = await res.json();
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0]).toMatchObject({ rating: 5, title: 'Love it', author: 'Asha R.', verified: true });
    expect(body.reviews[0].user_id).toBeUndefined();
    expect(body.summary).toMatchObject({ average: 5, count: 1 });
  });
});

describe('POST /api/products/[id]/reviews', () => {
  it('requires sign-in', async () => {
    user = null;
    expect((await (await productRoute()).POST(json({ rating: 5, body: 'Great tee, love it.' }), ctx('p1'))).status).toBe(401);
  });

  it('only customers who received the product can review it', async () => {
    deliveredOrder = null;
    const res = await (await productRoute()).POST(json({ rating: 5, body: 'Great tee, love it.' }), ctx('p1'));
    expect(res.status).toBe(403);
  });

  it('validates the review', async () => {
    const res = await (await productRoute()).POST(json({ rating: 9, body: 'Great tee, love it.' }), ctx('p1'));
    expect(res.status).toBe(400);
  });

  it('saves the review as pending (awaiting approval)', async () => {
    const res = await (await productRoute()).POST(json({ rating: 4, title: 'Nice', body: 'Great tee, love it.' }), ctx('p1'));
    expect(res.status).toBe(200);
    expect(reviews.find((r) => r.user_id === 'u1')).toMatchObject({ product_id: 'p1', order_id: 'o1', rating: 4, status: 'pending' });
  });

  it('editing an approved review sends it back for approval', async () => {
    reviews.push({ id: 'r9', product_id: 'p1', user_id: 'u1', rating: 5, body: 'Old text here', status: 'approved' });
    await (await productRoute()).POST(json({ rating: 2, body: 'Shrunk after washing.' }), ctx('p1'));
    expect(reviews.find((r) => r.id === 'r9')).toMatchObject({ rating: 2, status: 'pending' });
  });
});

describe('GET /api/products/[id]/reviews/me', () => {
  it('tells a customer whether they can review and returns their review', async () => {
    reviews.push({ id: 'r9', product_id: 'p1', user_id: 'u1', rating: 4, body: 'Mine mine mine', status: 'pending' });
    const body = await (await (await meRoute()).GET(new Request('http://x'), ctx('p1'))).json();
    expect(body).toMatchObject({ canReview: true, review: { rating: 4, status: 'pending' } });
  });
});

describe('admin reviews', () => {
  it('is admin-only', async () => {
    expect((await (await adminList()).GET(new Request('http://x/api/admin/reviews'))).status).toBe(403);
  });

  it('lists reviews by status (pending first by default)', async () => {
    isAdmin = true;
    const body = await (await (await adminList()).GET(new Request('http://x/api/admin/reviews'))).json();
    expect(body.reviews.map((r: any) => r.id)).toEqual(['r3']);
    const all = await (await (await adminList()).GET(new Request('http://x/api/admin/reviews?status=all'))).json();
    expect(all.reviews).toHaveLength(3);
  });

  it('approves or hides a review', async () => {
    isAdmin = true;
    const patch = (status: string) => new Request('http://x', { method: 'PATCH', body: JSON.stringify({ status }) });
    expect((await (await adminOne()).PATCH(patch('approved'), ctx('r3'))).status).toBe(200);
    expect(reviews.find((r) => r.id === 'r3')!.status).toBe('approved');
    expect((await (await adminOne()).PATCH(patch('deleted'), ctx('r3'))).status).toBe(400);
  });

  it('deletes a review', async () => {
    isAdmin = true;
    await (await adminOne()).DELETE(new Request('http://x'), ctx('r2'));
    expect(reviews.map((r) => r.id)).toEqual(['r1', 'r3']);
  });
});
