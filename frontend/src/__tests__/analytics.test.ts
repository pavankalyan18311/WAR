import { describe, expect, it } from 'vitest';
import { buildAnalytics } from '@/lib/analytics';

const now = new Date('2026-10-07T12:00:00Z');
const order = (daysAgo: number, total: number, extra: Record<string, string> = {}) => ({
  total,
  status: 'confirmed',
  payment_status: 'paid',
  created_at: new Date(now.getTime() - daysAgo * 86_400_000).toISOString(),
  ...extra,
});

describe('buildAnalytics', () => {
  it('returns zeros (not fake numbers) when there are no orders', () => {
    const a = buildAnalytics([], now);
    expect(a.totalRevenue).toBe(0);
    expect(a.totalOrders).toBe(0);
    expect(a.averageOrderValue).toBe(0);
    expect(a.revenueChangePct).toBeNull();
    expect(a.last7Days).toHaveLength(7);
    expect(a.last7Days.every((d) => d.revenue === 0 && d.orders === 0)).toBe(true);
  });

  it('excludes cancelled, refunded and failed-payment orders', () => {
    const a = buildAnalytics([
      order(0, 1000),
      order(0, 500, { status: 'cancelled' }),
      order(0, 500, { status: 'refunded' }),
      order(0, 500, { payment_status: 'failed' }),
    ], now);
    expect(a.totalRevenue).toBe(1000);
    expect(a.totalOrders).toBe(1);
    expect(a.averageOrderValue).toBe(1000);
  });

  it('groups the last 7 days by day, oldest first, ending today', () => {
    const a = buildAnalytics([order(0, 300), order(0, 200), order(6, 100), order(7, 999)], now);
    expect(a.last7Days[6]).toMatchObject({ date: '2026-10-07', revenue: 500, orders: 2 });
    expect(a.last7Days[0]).toMatchObject({ date: '2026-10-01', revenue: 100, orders: 1 });
  });

  it('computes revenue change of last 7 days vs the previous 7 days', () => {
    const a = buildAnalytics([order(1, 1500), order(9, 1000)], now);
    expect(a.revenueChangePct).toBe(50);
  });
});
