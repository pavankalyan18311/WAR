// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let isAdmin = true;
vi.mock('@/lib/apiAuth', () => ({
  requireAdmin: async () =>
    isAdmin
      ? { user: { id: 'admin' }, response: null }
      : { user: null, response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) },
}));

const cancelOrderItem = vi.fn();
vi.mock('@/lib/checkout/cancel', async (orig) => ({
  ...(await orig<any>()),
  cancelOrderItem: (...a: any[]) => cancelOrderItem(...a),
}));

const awardPointsOnDelivery = vi.fn(async () => 0);
vi.mock('@/lib/rewards', async (orig) => ({ ...(await orig<any>()), awardPointsOnDelivery: (...a: any[]) => (awardPointsOnDelivery as any)(...a) }));
const sendOrderEmail = vi.fn();
vi.mock('@/lib/email/orderEmails', () => ({ sendOrderEmail: (...a: any[]) => sendOrderEmail(...a) }));

const updates: any[] = [];
const ORDER = { id: 'o1', user_id: 'u1', status: 'confirmed', total: 1000, created_at: '2026-10-07T00:00:00Z', shipping_address: {}, order_items: [] };
let items = [{ id: 'i1', status: 'active' }, { id: 'i2', status: 'cancelled' }, { id: 'i3', status: 'active' }];
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      const b: any = {
        select: () => b, order: () => b, in: () => b, eq: () => b,
        update: (p: any) => { updates.push(p); return b; },
        maybeSingle: async () => ({ data: ORDER, error: null }),
        then: (r: any) => r({
          data: table === 'orders' ? [ORDER] : table === 'order_items' ? items : [{ id: 'u1', email: 'c@x.in' }],
          error: null,
        }),
      };
      return b;
    },
  }),
}));

const json = (body: any) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) });
const ctx = { params: Promise.resolve({ id: 'o1' }) };

beforeEach(() => {
  isAdmin = true; updates.length = 0; cancelOrderItem.mockReset(); awardPointsOnDelivery.mockClear(); sendOrderEmail.mockClear();
  items = [{ id: 'i1', status: 'active' }, { id: 'i2', status: 'cancelled' }, { id: 'i3', status: 'active' }];
});

describe('GET /api/admin/orders', () => {
  it('is admin-only', async () => {
    isAdmin = false;
    const { GET } = await import('@/app/api/admin/orders/route');
    expect((await GET()).status).toBe(403);
  });

  it('lists orders with the customer email', async () => {
    const { GET } = await import('@/app/api/admin/orders/route');
    const body = await (await GET()).json();
    expect(body.orders[0]).toMatchObject({ id: 'o1', email: 'c@x.in', reference: 'WAR-O1' });
  });
});

describe('PATCH /api/admin/orders/[id]', () => {
  it('updates fulfilment status and tracking number', async () => {
    const { PATCH } = await import('@/app/api/admin/orders/[id]/route');
    expect((await PATCH(json({ status: 'shipped', tracking_number: ' AWB1 ' }), ctx)).status).toBe(200);
    expect(updates[0]).toMatchObject({ status: 'shipped', tracking_number: 'AWB1' });
  });

  it('marking an order delivered awards reward points and sends the delivered email', async () => {
    const { PATCH } = await import('@/app/api/admin/orders/[id]/route');
    expect((await PATCH(json({ status: 'delivered' }), ctx)).status).toBe(200);
    expect(awardPointsOnDelivery).toHaveBeenCalledWith(expect.anything(), 'o1');
    expect(sendOrderEmail).toHaveBeenCalledWith(expect.anything(), 'o1', { kind: 'order_delivered' });
  });

  it('other status changes do not award points', async () => {
    const { PATCH } = await import('@/app/api/admin/orders/[id]/route');
    await PATCH(json({ status: 'shipped' }), ctx);
    expect(awardPointsOnDelivery).not.toHaveBeenCalled();
  });

  it.each(['cancelled', 'refunded', 'returned', 'pending'])('does not allow setting %s directly', async (status) => {
    const { PATCH } = await import('@/app/api/admin/orders/[id]/route');
    expect((await PATCH(json({ status }), ctx)).status).toBe(400);
    expect(updates).toHaveLength(0);
  });
});

describe('POST /api/admin/orders/[id]/cancel', () => {
  it('cancels (and refunds) every active item', async () => {
    cancelOrderItem.mockResolvedValue({ refundId: 'r', refundAmount: 500, newTotal: 0, newStatus: 'cancelled' });
    const { POST } = await import('@/app/api/admin/orders/[id]/cancel/route');
    const res = await POST(new Request('http://x', { method: 'POST' }), ctx);
    expect(res.status).toBe(200);
    expect(cancelOrderItem.mock.calls.map((c) => c[2])).toEqual(['i1', 'i3']);
    expect((await res.json()).refunded).toBe(1000);
  });
});
