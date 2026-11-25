import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const payload = {
  order_id: 'o1', order_date: '2026-10-07 10:00:00', billing_customer_name: 'Asha',
  billing_address: '12 MG Road', billing_city: 'Bengaluru', billing_pincode: '560001',
  billing_state: 'Karnataka', billing_country: 'India', billing_email: 'a@b.c',
  billing_phone: '9876501234', shipping_is_billing: true,
  order_items: [{ name: 'Tee', sku: 'T1', units: 1, selling_price: 799 }],
  payment_method: 'Prepaid' as const, sub_total: 799,
};

async function load() {
  vi.resetModules();
  return import('@/lib/shiprocket');
}

describe('Shiprocket in production', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SHIPROCKET_SANDBOX', 'true'); // must NOT enable fakes in production
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('fails (no fake AWB) when credentials are missing', async () => {
    vi.stubEnv('SHIPROCKET_EMAIL', '');
    vi.stubEnv('SHIPROCKET_PASSWORD', '');
    const { createShiprocketOrder, checkPincodeServiceability } = await load();

    const order = await createShiprocketOrder(payload);
    expect(order.success).toBe(false);
    expect(order.awb_code).toBeUndefined();

    const service = await checkPincodeServiceability('560001');
    expect(service.success).toBe(false);
    expect(service.serviceable).toBe(false);
  });

  it('fails when the Shiprocket login is rejected', async () => {
    vi.stubEnv('SHIPROCKET_EMAIL', 'ops@war.in');
    vi.stubEnv('SHIPROCKET_PASSWORD', 'secret');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));
    const { createShiprocketOrder } = await load();

    expect((await createShiprocketOrder(payload)).success).toBe(false);
  });

  it('does not invent an AWB when Shiprocket has not assigned one yet', async () => {
    vi.stubEnv('SHIPROCKET_EMAIL', 'ops@war.in');
    vi.stubEnv('SHIPROCKET_PASSWORD', 'secret');
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: 'tok' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ order_id: 77, shipment_id: 88 }), { status: 200 }));
    const { createShiprocketOrder } = await load();

    const res = await createShiprocketOrder(payload);
    expect(res).toMatchObject({ success: true, shipment_id: 88 });
    expect(res.awb_code).toBeUndefined();
  });
});
