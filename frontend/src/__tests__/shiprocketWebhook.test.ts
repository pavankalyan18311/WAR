// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const awardPointsOnDelivery = vi.fn(async () => 0);
vi.mock('@/lib/rewards', async (orig) => ({ ...(await orig<any>()), awardPointsOnDelivery: (...a: any[]) => (awardPointsOnDelivery as any)(...a) }));
const sendOrderEmail = vi.fn();
vi.mock('@/lib/email/orderEmails', () => ({ sendOrderEmail: (...a: any[]) => sendOrderEmail(...a) }));

let orders: any[];
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => {
      let patch: any = null;
      const filters: [string, any][] = [];
      const b: any = {
        update: (p: any) => { patch = p; return b; },
        select: () => b,
        eq: (k: string, v: any) => { filters.push([k, v]); return b; },
        then: (resolve: any) => {
          const rows = orders.filter((o) => filters.every(([k, v]) => o[k] === v));
          rows.forEach((r) => Object.assign(r, patch));
          return resolve({ data: rows.map((r) => ({ id: r.id })), error: null });
        },
      };
      return b;
    },
  }),
}));

const post = async (body: any) => {
  const { POST } = await import('@/app/api/webhooks/shiprocket/route');
  return POST(new Request('http://x', { method: 'POST', headers: { 'x-api-key': 'tok' }, body: JSON.stringify(body) }));
};

describe('POST /api/webhooks/shiprocket', () => {
  beforeEach(() => {
    vi.stubEnv('SHIPROCKET_WEBHOOK_TOKEN', 'tok');
    sendOrderEmail.mockClear();
    awardPointsOnDelivery.mockClear();
    orders = [{ id: 'o1', status: 'shipped', tracking_number: 'AWB1' }];
  });

  it('marks the order delivered and emails the customer', async () => {
    const res = await post({ awb: 'AWB1', current_status: 'DELIVERED' });
    expect(res.status).toBe(200);
    expect(orders[0].status).toBe('delivered');
    expect(sendOrderEmail).toHaveBeenCalledWith(expect.anything(), 'o1', { kind: 'order_delivered' });
    expect(awardPointsOnDelivery).toHaveBeenCalledWith(expect.anything(), 'o1');
  });

  it('saves the AWB and courier chosen in Shiprocket (e.g. when the admin assigned it there)', async () => {
    orders = [{ id: 'o1', status: 'confirmed', tracking_number: null }];
    await post({ order_id: 'o1', awb: 'AWB77', courier_name: 'Ekart Logistics', current_status: 'PICKUP_SCHEDULED' });
    expect(orders[0]).toMatchObject({ tracking_number: 'AWB77', courier_name: 'Ekart Logistics', status: 'processing' });
  });

  it('does not email for other status updates', async () => {
    await post({ awb: 'AWB1', current_status: 'IN_TRANSIT' });
    expect(sendOrderEmail).not.toHaveBeenCalled();
  });

  it('rejects a wrong token', async () => {
    const { POST } = await import('@/app/api/webhooks/shiprocket/route');
    const res = await POST(new Request('http://x', { method: 'POST', headers: { 'x-api-key': 'bad' }, body: '{}' }));
    expect(res.status).toBe(401);
  });
});
