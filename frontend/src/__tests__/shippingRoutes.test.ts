import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let isAdmin = false;
vi.mock('@/lib/apiAuth', () => ({
  requireAdmin: async () =>
    isAdmin
      ? { user: { id: 'admin' }, response: null }
      : { user: null, response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) },
}));

const dispatchShipment = vi.fn();
vi.mock('@/lib/checkout/fulfil', () => ({ dispatchShipment: (...a: any[]) => dispatchShipment(...a) }));

const updates: any[] = [];
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => {
      const b: any = {
        update: (p: any) => { updates.push(p); return b; },
        select: () => b,
        eq: () => b,
        maybeSingle: async () => ({ data: { id: 'o1', user_id: 'u1', profile: { email: 'c@x.in' } }, error: null }),
        then: (r: any) => r({ error: null }),
      };
      return b;
    },
  }),
}));

const post = (body: any, headers: Record<string, string> = {}) =>
  new Request('http://x', { method: 'POST', body: JSON.stringify(body), headers });

describe('POST /api/shipping/create-order', () => {
  beforeEach(() => { vi.clearAllMocks(); isAdmin = false; });

  it('is admin-only', async () => {
    const { POST } = await import('@/app/api/shipping/create-order/route');
    expect((await POST(post({ order_id: 'o1' }))).status).toBe(403);
    expect(dispatchShipment).not.toHaveBeenCalled();
  });

  it('lets an admin (re)book the shipment for an order and reports the result', async () => {
    isAdmin = true;
    dispatchShipment.mockResolvedValueOnce({ status: 'ready' });
    const { POST } = await import('@/app/api/shipping/create-order/route');
    const res = await POST(post({ order_id: 'o1' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, status: 'ready' });
    expect(dispatchShipment).toHaveBeenCalledWith(expect.anything(), 'o1', expect.any(String));
  });

  it('passes Shiprocket\'s error back to the admin', async () => {
    isAdmin = true;
    dispatchShipment.mockResolvedValueOnce({ status: 'failed', error: 'Wrong Pickup location entered.' });
    const { POST } = await import('@/app/api/shipping/create-order/route');
    const res = await POST(post({ order_id: 'o1' }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe('Wrong Pickup location entered.');
  });
});

describe('POST /api/webhooks/shiprocket', () => {
  beforeEach(() => { updates.length = 0; vi.stubEnv('SHIPROCKET_WEBHOOK_TOKEN', 'hook-secret'); });
  afterEach(() => vi.unstubAllEnvs());

  it('rejects calls without the secret token', async () => {
    const { POST } = await import('@/app/api/webhooks/shiprocket/route');
    const res = await POST(post({ order_id: 'o1', current_status: 'DELIVERED' }, { 'x-api-key': 'wrong' }));
    expect(res.status).toBe(401);
    expect(updates).toHaveLength(0);
  });

  it('rejects everything when no token is configured', async () => {
    vi.stubEnv('SHIPROCKET_WEBHOOK_TOKEN', '');
    const { POST } = await import('@/app/api/webhooks/shiprocket/route');
    expect((await POST(post({ order_id: 'o1' }, { 'x-api-key': '' }))).status).toBe(401);
  });

  it('updates the order status with a valid token', async () => {
    const { POST } = await import('@/app/api/webhooks/shiprocket/route');
    const res = await POST(post({ order_id: 'o1', awb: 'AWB9', current_status: 'DELIVERED' }, { 'x-api-key': 'hook-secret' }));
    expect(res.status).toBe(200);
    expect(updates[0]).toMatchObject({ status: 'delivered', tracking_number: 'AWB9' });
  });

  it('ignores unknown statuses instead of guessing "shipped"', async () => {
    const { POST } = await import('@/app/api/webhooks/shiprocket/route');
    await POST(post({ order_id: 'o1', current_status: 'SOMETHING_NEW' }, { 'x-api-key': 'hook-secret' }));
    expect(updates[0]?.status).toBeUndefined();
  });
});
