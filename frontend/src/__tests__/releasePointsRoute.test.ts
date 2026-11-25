// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let signedIn: { id: string } | null = { id: 'me' };
vi.mock('@/lib/apiAuth', () => ({
  requireUser: async () => (signedIn ? { user: signedIn, response: null }
    : { user: null, response: NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 }) }),
}));
const restorePoints = vi.fn(async () => 200);
vi.mock('@/lib/rewards', async (orig) => ({ ...(await orig<any>()), restorePoints: (...a: any[]) => (restorePoints as any)(...a) }));

let order: any;
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => {
      const filters: [string, any][] = [];
      const b: any = {
        select: () => b,
        eq: (k: string, v: any) => { filters.push([k, v]); return b; },
        maybeSingle: async () => ({ data: order && filters.every(([k, v]) => order[k] === v) ? order : null, error: null }),
      };
      return b;
    },
  }),
}));

const post = async (body: any) => (await import('@/app/api/orders/release-points/route')).POST(
  new Request('http://x', { method: 'POST', body: JSON.stringify(body) }),
);

describe('POST /api/orders/release-points (payment window closed)', () => {
  beforeEach(() => {
    signedIn = { id: 'me' };
    restorePoints.mockClear();
    order = { id: 'o1', user_id: 'me', status: 'pending', payment_status: 'pending', points_used: 200 };
  });

  it('gives the held points back for my unpaid order', async () => {
    const res = await post({ order_id: 'o1' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ restored: 200 });
    expect(restorePoints).toHaveBeenCalledWith(expect.anything(), 'o1');
  });

  it('does nothing for a paid order or someone else\'s order', async () => {
    order.payment_status = 'paid';
    expect((await (await post({ order_id: 'o1' })).json()).restored).toBe(0);
    order = { ...order, payment_status: 'pending', user_id: 'other' };
    expect((await post({ order_id: 'o1' })).status).toBe(404);
    expect(restorePoints).not.toHaveBeenCalled();
  });

  it('requires sign-in and an order id', async () => {
    signedIn = null;
    expect((await post({ order_id: 'o1' })).status).toBe(401);
    signedIn = { id: 'me' };
    expect((await post({})).status).toBe(400);
  });
});
