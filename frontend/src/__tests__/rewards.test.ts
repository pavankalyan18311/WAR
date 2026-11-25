import { describe, expect, it, vi } from 'vitest';
import { applyPoints, awardPointsOnDelivery, pointsForOrder, POINTS_VALID_DAYS } from '@/lib/rewards';

describe('pointsForOrder (random, by order value)', () => {
  it('below ₹1,000: 1–50 points', () => {
    expect(pointsForOrder(999, () => 0)).toBe(1);
    expect(pointsForOrder(999, () => 0.9999)).toBe(50);
    expect(pointsForOrder(100, () => 0.5)).toBeGreaterThanOrEqual(1);
  });
  it('₹1,000 and above: 50–100 points', () => {
    expect(pointsForOrder(1000, () => 0)).toBe(50);
    expect(pointsForOrder(5000, () => 0.9999)).toBe(100);
  });
  it('nothing for a ₹0 order', () => {
    expect(pointsForOrder(0, () => 0.5)).toBe(0);
  });
  it('is random across many orders and always in range', () => {
    const seen = new Set(Array.from({ length: 300 }, () => pointsForOrder(1500)));
    expect(seen.size).toBeGreaterThan(10);
    expect([...seen].every((p) => p >= 50 && p <= 100)).toBe(true);
  });
  it('points last 90 days', () => expect(POINTS_VALID_DAYS).toBe(90));
});

describe('applyPoints (checkout)', () => {
  const totals = { subtotal: 1200, discount: 200, shipping: 99, tax: 0, total: 1099 };

  it('uses all available points, up to the product value after coupon (never shipping)', () => {
    expect(applyPoints(totals, 300)).toEqual({ ...totals, points_used: 300, total: 799 });
    expect(applyPoints(totals, 5000)).toEqual({ ...totals, points_used: 1000, total: 99 });
  });
  it('no points → unchanged', () => {
    expect(applyPoints(totals, 0)).toEqual({ ...totals, points_used: 0 });
  });
  it('can bring the total to ₹0 when shipping is free', () => {
    expect(applyPoints({ ...totals, shipping: 0, total: 1000 }, 1000).total).toBe(0);
  });
});

describe('awardPointsOnDelivery', () => {
  function fakeDb(order: any, opts: { insertError?: any } = {}) {
    const inserted: any[] = [];
    const updates: any[] = [];
    return {
      inserted, updates,
      from: (table: string) => {
        const b: any = {
          select: () => b, eq: () => b,
          maybeSingle: async () => ({ data: table === 'orders' ? order : null, error: null }),
          insert: async (row: any) => { if (opts.insertError) return { error: opts.insertError }; inserted.push(row); return { error: null }; },
          update: (p: any) => { updates.push(p); return b; },
          then: (r: any) => r({ data: null, error: null }),
        };
        return b;
      },
    };
  }

  it('awards random points on the amount paid for products (no shipping) with a 90-day expiry', async () => {
    const db = fakeDb({ id: 'o1', user_id: 'u1', status: 'delivered', total: 1099, shipping: 99, points_earned: null });
    const pts = await awardPointsOnDelivery(db, 'o1', () => 0);
    expect(pts).toBe(50); // ₹1,000 paid for products → 50–100
    const row = db.inserted[0];
    expect(row).toMatchObject({ user_id: 'u1', order_id: 'o1', kind: 'earn', points: 50, remaining: 50 });
    const days = (new Date(row.expires_at).getTime() - Date.now()) / 86_400_000;
    expect(Math.round(days)).toBe(90);
    expect(db.updates[0]).toEqual({ points_earned: 50 });
  });

  it('does nothing unless the order is delivered, or if it already earned points', async () => {
    expect(await awardPointsOnDelivery(fakeDb({ id: 'o1', user_id: 'u1', status: 'shipped', total: 999, shipping: 0 }), 'o1')).toBe(0);
    expect(await awardPointsOnDelivery(fakeDb({ id: 'o1', user_id: 'u1', status: 'delivered', total: 999, shipping: 0, points_earned: 20 }), 'o1')).toBe(0);
  });

  it('a repeated delivery update (unique-row conflict) does not award twice', async () => {
    const db = fakeDb({ id: 'o1', user_id: 'u1', status: 'delivered', total: 999, shipping: 0, points_earned: null }, { insertError: { code: '23505' } });
    expect(await awardPointsOnDelivery(db, 'o1')).toBe(0);
    expect(db.updates).toEqual([]);
  });

  it('never throws (a points problem must not break delivery updates)', async () => {
    const broken = { from: () => { throw new Error('db down'); } };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(awardPointsOnDelivery(broken, 'o1')).resolves.toBe(0);
    spy.mockRestore();
  });
});
