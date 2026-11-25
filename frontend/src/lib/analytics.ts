export interface AnalyticsOrder {
  total: number | string;
  status: string;
  payment_status: string;
  created_at: string;
}

export interface DailySales {
  date: string; // YYYY-MM-DD (India time)
  revenue: number;
  orders: number;
}

export interface Analytics {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  last7Days: DailySales[];
  /** % change of last 7 days' revenue vs the 7 days before; null when there is nothing to compare. */
  revenueChangePct: number | null;
}

const DAY_MS = 86_400_000;
const EXCLUDED_STATUSES = new Set(['cancelled', 'refunded']);
const EXCLUDED_PAYMENT_STATUSES = new Set(['failed', 'refunded']);

const toIndiaDate = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export function isCountedSale(order: AnalyticsOrder): boolean {
  return !EXCLUDED_STATUSES.has(order.status) && !EXCLUDED_PAYMENT_STATUSES.has(order.payment_status);
}

export function buildAnalytics(orders: AnalyticsOrder[], now: Date = new Date()): Analytics {
  const sales = orders.filter(isCountedSale);
  const totalRevenue = sales.reduce((sum, o) => sum + Number(o.total || 0), 0);

  const days = Array.from({ length: 14 }, (_, i) => toIndiaDate(new Date(now.getTime() - (13 - i) * DAY_MS)));
  const byDay = new Map(days.map((date) => [date, { date, revenue: 0, orders: 0 }]));
  for (const o of sales) {
    const bucket = byDay.get(toIndiaDate(new Date(o.created_at)));
    if (bucket) {
      bucket.revenue += Number(o.total || 0);
      bucket.orders += 1;
    }
  }

  const all = days.map((d) => byDay.get(d)!);
  const previous = all.slice(0, 7).reduce((s, d) => s + d.revenue, 0);
  const current = all.slice(7).reduce((s, d) => s + d.revenue, 0);

  return {
    totalRevenue,
    totalOrders: sales.length,
    averageOrderValue: sales.length ? Math.round(totalRevenue / sales.length) : 0,
    last7Days: all.slice(7),
    revenueChangePct: previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null,
  };
}
