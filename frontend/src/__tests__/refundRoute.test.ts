import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let signedIn: { id: string } | null = { id: 'me' };
vi.mock('@/lib/apiAuth', () => ({
  requireUser: async () =>
    signedIn
      ? { user: signedIn, response: null }
      : { user: null, response: NextResponse.json({ error: 'Please sign in' }, { status: 401 }) },
}));

const releaseStock = vi.fn();
vi.mock('@/lib/checkout/fulfil', () => ({ releaseStock: (...a: any[]) => releaseStock(...a) }));

const restorePoints = vi.fn(async () => 0);
vi.mock('@/lib/rewards', async (orig) => ({ ...(await orig<any>()), restorePoints: (...a: any[]) => (restorePoints as any)(...a) }));
const sendOrderEmail = vi.fn();
vi.mock('@/lib/email/orderEmails', () => ({ sendOrderEmail: (...a: any[]) => sendOrderEmail(...a) }));

const refundRazorpayPayment = vi.fn();
vi.mock('@/lib/razorpayServer', async (orig) => ({
  ...(await orig<any>()),
  refundRazorpayPayment: (...a: any[]) => refundRazorpayPayment(...a),
}));

let db: { orders: any[]; order_items: any[] };
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: 'orders' | 'order_items') => {
      const filters: [string, any][] = [];
      let patch: any = null;
      const rows = () => db[table].filter((r) => filters.every(([k, v]) => r[k] === v));
      const b: any = {
        update: (p: any) => { patch = p; return b; },
        select: () => b,
        eq: (k: string, v: any) => { filters.push([k, v]); return b; },
        maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
        then: (resolve: any) => {
          const matched = rows(); // rows the filter matched before the change (like PostgREST)
          if (patch) matched.forEach((r) => Object.assign(r, patch));
          return resolve({ data: matched, error: null });
        },
      };
      return b;
    },
  }),
}));

const route = () => import('@/app/api/payments/razorpay/refund/route');
const cancel = (item_id: string) =>
  new Request('http://x', { method: 'POST', body: JSON.stringify({ order_id: 'o1', item_id }) });

function seed(order: Partial<any> = {}) {
  db = {
    orders: [{
      id: 'o1', user_id: 'me', status: 'confirmed', payment_method: 'upi', payment_status: 'paid',
      razorpay_payment_id: 'pay_1', subtotal: 2000, discount: 200, shipping: 0, total: 1800, ...order,
    }],
    order_items: [
      { id: 'i1', order_id: 'o1', variant_id: 'v1', quantity: 1, total_price: 1000, status: 'active' },
      { id: 'i2', order_id: 'o1', variant_id: 'v2', quantity: 1, total_price: 1000, status: 'active' },
    ],
  };
}

describe('POST /api/payments/razorpay/refund (cancel an item)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signedIn = { id: 'me' };
    refundRazorpayPayment.mockResolvedValue({ id: 'rfnd_1', amount: 90000, status: 'processed' });
    seed();
  });

  it('requires sign-in and ownership', async () => {
    signedIn = null;
    expect((await (await route()).POST(cancel('i1'))).status).toBe(401);
    signedIn = { id: 'someone-else' };
    expect((await (await route()).POST(cancel('i1'))).status).toBe(404);
  });

  it('refunds the item price minus its share of the coupon, restocks, and lowers the total', async () => {
    const res = await (await route()).POST(cancel('i1'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(refundRazorpayPayment).toHaveBeenCalledWith('pay_1', 90000, expect.any(Object));
    expect(releaseStock).toHaveBeenCalledWith(expect.anything(), [{ variant_id: 'v1', quantity: 1 }]);
    expect(db.order_items[0].status).toBe('cancelled');
    expect(db.orders[0]).toMatchObject({ total: 900, status: 'confirmed', payment_status: 'paid' });
    expect(body).toMatchObject({ success: true, refund_amount: 900, new_total: 900, new_status: 'confirmed' });
  });

  it('emails the customer about the cancelled item and the refund', async () => {
    await (await route()).POST(cancel('i1'));
    expect(sendOrderEmail).toHaveBeenCalledWith(expect.anything(), 'o1', { kind: 'item_cancelled', itemId: 'i1', refundAmount: 900 });
  });

  it('refunds everything left (incl. shipping) when the last item is cancelled', async () => {
    seed({ shipping: 99, total: 1899 });
    db.order_items[1].status = 'cancelled';
    db.orders[0].total = 999; // after first cancellation: 1899 - 900
    await (await route()).POST(cancel('i1'));
    expect(refundRazorpayPayment).toHaveBeenCalledWith('pay_1', 99900, expect.any(Object));
    expect(db.orders[0]).toMatchObject({ total: 0, status: 'cancelled', payment_status: 'refunded' });
  });

  it('reward points count like a discount: a partial cancel refunds only the share of the cash paid for that item', async () => {
    seed({ discount: 200, points_used: 800, total: 1000 }); // 2000 − 200 coupon − 800 points
    await (await route()).POST(cancel('i1'));
    expect(refundRazorpayPayment).toHaveBeenCalledWith('pay_1', 50000, expect.any(Object)); // 1000 − (200+800)/2
    expect(restorePoints).not.toHaveBeenCalled();
  });

  it('cancelling the whole order gives the reward points back', async () => {
    seed({ discount: 0, points_used: 300, total: 1700 });
    db.order_items[1].status = 'cancelled';
    db.orders[0].total = 700;
    await (await route()).POST(cancel('i1'));
    expect(restorePoints).toHaveBeenCalledWith(expect.anything(), 'o1');
  });

  it('does not call Razorpay for cash on delivery', async () => {
    seed({ payment_method: 'cod', payment_status: 'pending', razorpay_payment_id: null });
    const res = await (await route()).POST(cancel('i1'));
    expect(res.status).toBe(200);
    expect(refundRazorpayPayment).not.toHaveBeenCalled();
  });

  it('two cancel clicks at once refund only once', async () => {
    const { POST } = await route();
    const [a, b] = await Promise.all([POST(cancel('i1')), POST(cancel('i1'))]);
    expect([a.status, b.status].sort()).toEqual([200, 400]);
    expect(refundRazorpayPayment).toHaveBeenCalledTimes(1);
    expect(releaseStock).toHaveBeenCalledTimes(1);
  });

  it('refuses once the order has shipped', async () => {
    seed({ status: 'shipped' });
    expect((await (await route()).POST(cancel('i1'))).status).toBe(400);
    expect(refundRazorpayPayment).not.toHaveBeenCalled();
  });

  it('leaves everything untouched when Razorpay refuses the refund', async () => {
    refundRazorpayPayment.mockRejectedValue(new Error('refund failed'));
    const res = await (await route()).POST(cancel('i1'));
    expect(res.status).toBe(502);
    expect(db.order_items[0].status).toBe('active');
    expect(releaseStock).not.toHaveBeenCalled();
    expect(sendOrderEmail).not.toHaveBeenCalled();
  });
});
