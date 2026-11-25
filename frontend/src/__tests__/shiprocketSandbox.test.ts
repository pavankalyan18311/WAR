// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

/** Without Shiprocket credentials (development), the site simulates Shiprocket step by step. */
const load = async () => {
  vi.resetModules();
  vi.stubEnv('SHIPROCKET_EMAIL', '');
  vi.stubEnv('SHIPROCKET_PASSWORD', '');
  return import('@/lib/shiprocket');
};

describe('Shiprocket simulation (development, no credentials)', () => {
  it('creating the order returns a shipment but no AWB yet — just like real Shiprocket', async () => {
    const { createShiprocketOrder } = await load();
    const r = await createShiprocketOrder({ order_id: 'o1' } as any);
    expect(r.success).toBe(true);
    expect(r.shipment_id).toBeTruthy();
    expect(r.awb_code).toBeUndefined();
  });

  it('assigning the courier gives a test AWB and courier', async () => {
    const { assignAwb } = await load();
    const r = await assignAwb('222');
    expect(r.awb_code).toMatch(/^SRK-DEV-/);
    expect(r.courier_name).toBeTruthy();
  });

  it('the label is a printable sample page on our own site', async () => {
    const { generateLabel } = await load();
    expect(await generateLabel('222')).toEqual({ success: true, label_url: '/api/shipping/dev-label/222' });
  });
});

let isAdmin = true;
vi.mock('@/lib/apiAuth', () => ({
  requireAdmin: async () => (isAdmin ? { user: { id: 'admin' }, response: null }
    : { user: null, response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) }),
}));
const ORDER = {
  id: 'abcdef12-0000-0000-0000-000000000000', created_at: '2026-10-13T06:00:00Z', payment_method: 'cod', total: 1098, shipping: 99,
  tracking_number: 'SRK-DEV-123456789', courier_name: 'Delhivery Surface (test)', shiprocket_shipment_id: '222',
  shipping_address: { full_name: 'Asha <b>Rao</b>', phone: '9876501234', address_line_1: '12 MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
  order_items: [{ quantity: 1, status: 'active', product: { name: 'Oversized Tee' }, variant: { sku: 'TEE-M' } }],
};
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (t: string) => {
      const b: any = {
        select: () => b, eq: () => b,
        maybeSingle: async () => ({ data: t === 'orders' ? ORDER : { shiprocket_pickup_location: 'Hyderabad Hub', parcel_weight_kg: 0.3 }, error: null }),
      };
      return b;
    },
  }),
}));

describe('GET /api/shipping/dev-label/[shipmentId]', () => {
  const get = async () => (await import('@/app/api/shipping/dev-label/[shipmentId]/route'))
    .GET(new Request('http://x'), { params: Promise.resolve({ shipmentId: '222' }) });
  beforeEach(() => { isAdmin = true; vi.unstubAllEnvs(); });

  it('shows a printable 4×6 label with AWB, courier, ship-to, COD amount and order reference', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    for (const s of ['SRK-DEV-123456789', 'Delhivery Surface (test)', '12 MG Road', 'Bengaluru', '560001', '98XXXXXX34', 'COD', '₹1,098', 'WAR-ABCDEF12', 'Hyderabad Hub', 'TEST LABEL']) {
      expect(html).toContain(s);
    }
    expect(html).not.toContain('<b>Rao</b>'); // customer text is escaped
    expect(html).not.toContain('9876501234'); // phone is masked on the printed label
    expect(html).toContain('Kondapur'); // FROM: the hub address
    expect(html).toContain('500084');
  });

  it('is admin-only and never available in production', async () => {
    isAdmin = false;
    expect((await get()).status).toBe(403);
    isAdmin = true;
    vi.stubEnv('NODE_ENV', 'production');
    expect((await get()).status).toBe(404);
  });
});
