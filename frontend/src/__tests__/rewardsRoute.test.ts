// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let signedIn: { id: string } | null = { id: 'me' };
vi.mock('@/lib/apiAuth', () => ({
  requireUser: async () => (signedIn ? { user: signedIn, response: null }
    : { user: null, response: NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 }) }),
}));

const now = Date.now();
const day = 86_400_000;
let rows: any[];
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => {
      const b: any = {
        select: () => b, eq: () => b, order: () => b, limit: () => b,
        then: (r: any) => r({ data: rows, error: null }),
      };
      return b;
    },
  }),
}));

const get = async () => (await import('@/app/api/rewards/route')).GET();

describe('GET /api/rewards', () => {
  beforeEach(() => {
    signedIn = { id: 'me' };
    rows = [
      { id: 'e1', kind: 'earn', points: 60, remaining: 60, expires_at: new Date(now + 80 * day).toISOString(), created_at: new Date(now - 10 * day).toISOString(), order_id: 'abcdef12-0000-0000-0000-000000000000' },
      { id: 'e2', kind: 'earn', points: 30, remaining: 10, expires_at: new Date(now + 5 * day).toISOString(), created_at: new Date(now - 85 * day).toISOString(), order_id: null },
      { id: 'e3', kind: 'earn', points: 40, remaining: 40, expires_at: new Date(now - 1 * day).toISOString(), created_at: new Date(now - 91 * day).toISOString(), order_id: null },
      { id: 'r1', kind: 'redeem', points: -20, remaining: 0, expires_at: null, created_at: new Date(now - 2 * day).toISOString(), order_id: '12345678-0000-0000-0000-000000000000' },
    ];
  });

  it('requires sign-in', async () => {
    signedIn = null;
    expect((await get()).status).toBe(401);
  });

  it('returns the spendable balance (expired points excluded)', async () => {
    expect((await (await get()).json()).balance).toBe(70);
  });

  it('warns about points expiring within 14 days', async () => {
    const body = await (await get()).json();
    expect(body.expiringSoon).toMatchObject({ points: 10 });
  });

  it('lists history with friendly labels and order references', async () => {
    const { history } = await (await get()).json();
    expect(history.map((h: any) => [h.label, h.points])).toEqual([
      ['Earned on order WAR-ABCDEF12', 60],
      ['Earned', 30],
      ['Earned (expired)', 40],
      ['Used on order WAR-12345678', -20],
    ]);
  });
});
