// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/apiAuth', () => ({ requireAdmin: async () => ({ user: { id: 'admin' }, response: null }) }));

const future = new Date(Date.now() + 10 * 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();
const tables: Record<string, any[]> = {
  profiles: [{ id: 'u1', name: 'Asha', email: 'a@x.in', created_at: '2026-10-01T00:00:00Z', role: 'customer' }],
  orders: [
    { user_id: 'u1', total: 1000, status: 'delivered', payment_method: 'upi', payment_status: 'paid', created_at: '2026-10-02T00:00:00Z' },
    { user_id: 'u1', total: 500, status: 'confirmed', payment_method: 'cod', payment_status: 'pending', created_at: '2026-10-03T00:00:00Z' },
    { user_id: 'u1', total: 900, status: 'pending', payment_method: 'card', payment_status: 'pending', created_at: '2026-10-04T00:00:00Z' }, // abandoned
    { user_id: 'u1', total: 700, status: 'cancelled', payment_method: 'cod', payment_status: 'pending', created_at: '2026-10-05T00:00:00Z' },
  ],
  reward_points: [
    { user_id: 'u1', kind: 'earn', remaining: 60, expires_at: future },
    { user_id: 'u1', kind: 'earn', remaining: 40, expires_at: past },
  ],
};
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (t: string) => {
      const b: any = { select: () => b, order: () => b, in: () => b, eq: () => b, gt: () => b, then: (r: any) => r({ data: tables[t], error: null }) };
      return b;
    },
  }),
}));

describe('GET /api/admin/customers', () => {
  it('counts only real orders and shows each customer\'s spendable reward points', async () => {
    const { GET } = await import('@/app/api/admin/customers/route');
    const { customers } = await (await GET()).json();
    expect(customers[0]).toMatchObject({ orders_count: 2, total_spent: 1500, reward_points: 60 });
  });
});
