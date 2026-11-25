import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

let signedIn: { id: string; email: string } | null = { id: 'me', email: 'me@example.com' };
vi.mock('@/lib/apiAuth', () => ({
  requireUser: async () =>
    signedIn
      ? { user: signedIn, response: null }
      : { user: null, response: NextResponse.json({ error: 'Please sign in' }, { status: 401 }) },
}));

const priced = {
  lines: [{ variant_id: 'v1', product_id: 'p1', sku: 'S', name: 'Tee', quantity: 1, unit_price: 799, total_price: 799 }],
  totals: { subtotal: 799, discount: 0, shipping: 99, tax: 0, total: 898 },
  couponCode: null,
  settings: { free_shipping_threshold: 999, shipping_fee: 99, cod_enabled: true },
};
vi.mock('@/lib/checkout/priceOrder', async (orig) => ({
  ...(await orig<any>()),
  priceOrder: vi.fn(async () => priced),
  supabasePricingDeps: () => ({}),
}));

const reserveStock = vi.fn();
const afterOrderConfirmed = vi.fn();
vi.mock('@/lib/checkout/fulfil', () => ({
  reserveStock: (...a: any[]) => reserveStock(...a),
  releaseStock: vi.fn(),
  afterOrderConfirmed: (...a: any[]) => afterOrderConfirmed(...a),
}));

const redeemPoints = vi.fn(async () => true);
vi.mock('@/lib/rewards', async (orig) => ({ ...(await orig<any>()), redeemPoints: (...a: any[]) => (redeemPoints as any)(...a) }));

const createRazorpayOrder = vi.fn();
const fetchRazorpayPayment = vi.fn();
let signatureOk = true;
vi.mock('@/lib/razorpayServer', async (orig) => ({
  ...(await orig<any>()),
  razorpayConfigured: () => true,
  razorpayKeyId: () => 'rzp_test_key',
  isValidPaymentSignature: () => signatureOk,
  createRazorpayOrder: (...a: any[]) => createRazorpayOrder(...a),
  fetchRazorpayPayment: (...a: any[]) => fetchRazorpayPayment(...a),
}));

// Minimal in-memory "orders" / "order_items" tables.
let db: { orders: any[]; order_items: any[] };
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: 'orders' | 'order_items') => {
      const filters: [string, any][] = [];
      let patch: any = null;
      const rows = () => db[table].filter((r) => filters.every(([k, v]) => r[k] === v));
      const b: any = {
        insert: (p: any) => { db[table].push(...(Array.isArray(p) ? p : [p])); return Promise.resolve({ error: null }); },
        update: (p: any) => { patch = p; return b; },
        delete: () => { patch = '__delete__'; return b; },
        select: () => b,
        eq: (k: string, v: any) => { filters.push([k, v]); return b; },
        maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
        then: (resolve: any) => {
          const matched = rows(); // like PostgREST: report the rows the filter matched before the change
          if (patch === '__delete__') db[table] = db[table].filter((r) => !matched.includes(r));
          else if (patch) matched.forEach((r) => Object.assign(r, patch));
          return resolve({ data: matched, error: null });
        },
      };
      return b;
    },
  }),
}));

const address = {
  full_name: 'Asha Rao', phone: '9876501234', address_line_1: '12 MG Road',
  city: 'Bengaluru', state: 'Karnataka', pincode: '560001',
};
const req = (body: any) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  db = { orders: [], order_items: [] };
  signedIn = { id: 'me', email: 'me@example.com' };
  signatureOk = true;
  reserveStock.mockResolvedValue(true);
  createRazorpayOrder.mockResolvedValue({ id: 'order_rzp_1', amount: 89800, currency: 'INR' });
  redeemPoints.mockResolvedValue(true);
});

const mockPriced = async (over: any) => {
  const mod: any = await import('@/lib/checkout/priceOrder');
  mod.priceOrder.mockResolvedValueOnce({ ...priced, ...over });
};

describe('POST /api/payments/razorpay/create-order', () => {
  const route = () => import('@/app/api/payments/razorpay/create-order/route');

  it('requires sign-in', async () => {
    signedIn = null;
    expect((await (await route()).POST(req({}))).status).toBe(401);
  });

  it('charges the server-computed total and saves a pending order', async () => {
    const res = await (await route()).POST(req({ items: [{ variant_id: 'v1', quantity: 1 }], shipping_address: address, amount: 1 }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(createRazorpayOrder).toHaveBeenCalledWith(89800, body.order_id, expect.any(Object));
    expect(db.orders[0]).toMatchObject({
      id: body.order_id, user_id: 'me', total: 898, status: 'pending', payment_status: 'pending',
      razorpay_order_id: 'order_rzp_1',
    });
    expect(db.order_items).toHaveLength(1);
    expect(body).toMatchObject({ razorpay_order_id: 'order_rzp_1', amount: 89800, key_id: 'rzp_test_key' });
  });

  it('reward points: charges the reduced amount and holds the points for this order', async () => {
    await mockPriced({ pointsUsed: 200, totals: { ...priced.totals, total: 698 } });
    const body = await (await (await route()).POST(req({ items: [{ variant_id: 'v1', quantity: 1 }], shipping_address: address, points_to_use: 200 }))).json();
    expect(createRazorpayOrder).toHaveBeenCalledWith(69800, body.order_id, expect.any(Object));
    expect(db.orders[0]).toMatchObject({ total: 698, points_used: 200 });
    expect(redeemPoints).toHaveBeenCalledWith(expect.anything(), 'me', body.order_id, 200);
  });

  it('points no longer available → payment is not started and the order is removed', async () => {
    await mockPriced({ pointsUsed: 200, totals: { ...priced.totals, total: 698 } });
    redeemPoints.mockResolvedValueOnce(false);
    const res = await (await route()).POST(req({ items: [{ variant_id: 'v1', quantity: 1 }], shipping_address: address, points_to_use: 200 }));
    expect(res.status).toBe(409);
    expect(db.orders).toHaveLength(0);
  });

  it('an order fully covered by points does not go to Razorpay', async () => {
    await mockPriced({ pointsUsed: 799, totals: { ...priced.totals, shipping: 0, total: 0 } });
    const res = await (await route()).POST(req({ items: [{ variant_id: 'v1', quantity: 1 }], shipping_address: address, points_to_use: 799 }));
    expect(res.status).toBe(400);
    expect(createRazorpayOrder).not.toHaveBeenCalled();
  });
});

describe('POST /api/payments/razorpay/verify-payment', () => {
  const route = () => import('@/app/api/payments/razorpay/verify-payment/route');
  const pending = () => db.orders.push({
    id: 'o1', user_id: 'me', total: 898, status: 'pending', payment_status: 'pending',
    razorpay_order_id: 'order_rzp_1', coupon_code: null,
  });
  db = { orders: [], order_items: [] };
  const verify = (over: any = {}) => req({
    order_id: 'o1', razorpay_order_id: 'order_rzp_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig', ...over,
  });

  beforeEach(() => {
    db.order_items.push({ order_id: 'o1', variant_id: 'v1', quantity: 1 });
    fetchRazorpayPayment.mockResolvedValue({ id: 'pay_1', order_id: 'order_rzp_1', amount: 89800, status: 'captured', method: 'upi' });
  });

  it('rejects a bad signature without touching the order', async () => {
    pending();
    signatureOk = false;
    const res = await (await route()).POST(verify());
    expect(res.status).toBe(400);
    expect(db.orders[0].payment_status).toBe('pending');
  });

  it('rejects someone else\'s order', async () => {
    pending();
    db.orders[0].user_id = 'other';
    expect((await (await route()).POST(verify())).status).toBe(404);
  });

  it('rejects when the amount paid does not match the order total', async () => {
    pending();
    fetchRazorpayPayment.mockResolvedValue({ id: 'pay_1', order_id: 'order_rzp_1', amount: 100, status: 'captured' });
    const res = await (await route()).POST(verify());
    expect(res.status).toBe(400);
    expect(db.orders[0].payment_status).toBe('pending');
  });

  it('marks the order paid, takes stock and dispatches', async () => {
    pending();
    const res = await (await route()).POST(verify());
    expect(res.status).toBe(200);
    expect(db.orders[0]).toMatchObject({
      status: 'confirmed', payment_status: 'paid', payment_method: 'upi', razorpay_payment_id: 'pay_1',
    });
    expect(reserveStock).toHaveBeenCalledWith(expect.anything(), [{ variant_id: 'v1', quantity: 1 }]);
    expect(afterOrderConfirmed).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'o1', userId: 'me' }));
  });

  it('two confirmations arriving at once take stock and confirm only once', async () => {
    pending();
    const { POST } = await route();
    const [a, b] = await Promise.all([POST(verify()), POST(verify())]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(reserveStock).toHaveBeenCalledTimes(1);
    expect(afterOrderConfirmed).toHaveBeenCalledTimes(1);
  });

  it('re-checks the reward points on payment (they may have been given back after the window was closed)', async () => {
    pending();
    db.orders[0].points_used = 200;
    await (await route()).POST(verify());
    expect(redeemPoints).toHaveBeenCalledWith(expect.anything(), 'me', 'o1', 200);
  });

  it('flags the order for the admin if those points are gone by then', async () => {
    pending();
    db.orders[0].points_used = 200;
    redeemPoints.mockResolvedValueOnce(false);
    const res = await (await route()).POST(verify());
    expect(res.status).toBe(200);
    expect(db.orders[0].notes).toMatch(/POINTS/);
  });

  it('is idempotent: verifying an already paid order does nothing twice', async () => {
    pending();
    db.orders[0].payment_status = 'paid';
    const res = await (await route()).POST(verify());
    expect(res.status).toBe(200);
    expect(reserveStock).not.toHaveBeenCalled();
    expect(afterOrderConfirmed).not.toHaveBeenCalled();
  });
});
