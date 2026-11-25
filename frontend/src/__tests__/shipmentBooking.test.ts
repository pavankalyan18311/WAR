import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bookShipment, buildShipmentPayload, DEFAULT_SHIPPING_PARTNER, type ShippingPartnerApi } from '@/lib/shipping/booking';

const settings = { ...DEFAULT_SHIPPING_PARTNER, pickup_location: 'Hyderabad Hub', weight_kg: 0.3, length_cm: 30, breadth_cm: 25, height_cm: 3, auto_assign: true };

const baseOrder = {
  id: 'o1', user_id: 'u1', created_at: '2026-10-13T05:30:00Z', status: 'confirmed', payment_method: 'cod', payment_status: 'pending',
  subtotal: 2000, discount: 200, points_used: 100, shipping: 99, total: 1799,
  shipping_address: { full_name: 'Ravi Kumar Rao', phone: '9876501234', address_line_1: '12 MG Road', address_line_2: 'Near Metro', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
  tracking_number: null, shiprocket_shipment_id: null,
  order_items: [
    { quantity: 2, unit_price: 600, status: 'active', product: { name: 'Black Tee' }, variant: { sku: 'TEE-BLK-M' } },
    { quantity: 1, unit_price: 800, status: 'active', product: { name: 'Graphic Tee' }, variant: { sku: 'TEE-GRA-L' } },
    { quantity: 1, unit_price: 500, status: 'cancelled', product: { name: 'Cap' }, variant: { sku: 'CAP' } },
  ],
};

describe('buildShipmentPayload', () => {
  it('uses the pickup location and parcel size from settings; weight grows with the number of items', () => {
    const p = buildShipmentPayload(baseOrder, 'ravi@x.com', settings);
    expect(p).toMatchObject({
      order_id: 'o1', pickup_location: 'Hyderabad Hub',
      billing_customer_name: 'Ravi', billing_last_name: 'Kumar Rao',
      billing_address: '12 MG Road', billing_address_2: 'Near Metro', billing_city: 'Bengaluru', billing_pincode: '560001',
      billing_state: 'Karnataka', billing_country: 'India', billing_email: 'ravi@x.com', billing_phone: '9876501234',
      shipping_is_billing: true, payment_method: 'COD',
      length: 30, breadth: 25, height: 3, weight: 0.9, // 3 tees × 0.3 kg (cancelled cap excluded)
    });
    expect(p.order_items).toEqual([
      { name: 'Black Tee', sku: 'TEE-BLK-M', units: 2, selling_price: 600 },
      { name: 'Graphic Tee', sku: 'TEE-GRA-L', units: 1, selling_price: 800 },
    ]);
  });

  it('the amount Shiprocket collects on delivery equals what the customer owes', () => {
    const p = buildShipmentPayload(baseOrder, 'ravi@x.com', settings);
    // items 2000 + shipping 99 − (coupon 200 + points 100) = 1799 = order total
    expect(p.sub_total).toBe(2000);
    expect(p.shipping_charges).toBe(99);
    expect(p.total_discount).toBe(300);
    expect(p.sub_total + p.shipping_charges - p.total_discount).toBe(baseOrder.total);
  });

  it('online-paid orders are sent as Prepaid', () => {
    expect(buildShipmentPayload({ ...baseOrder, payment_method: 'upi', payment_status: 'paid' }, 'a@b.c', settings).payment_method).toBe('Prepaid');
    expect(buildShipmentPayload({ ...baseOrder, payment_method: 'points', payment_status: 'paid' }, 'a@b.c', settings).payment_method).toBe('Prepaid');
  });
});

describe('bookShipment', () => {
  let order: any;
  let updates: any[];
  const api: ShippingPartnerApi = {
    createOrder: vi.fn(async () => ({ success: true, order_id: 111, shipment_id: 222 })),
    assignAwb: vi.fn(async () => ({ success: true, awb_code: 'AWB123', courier_name: 'Delhivery Surface' })),
    schedulePickup: vi.fn(async () => ({ success: true })),
    generateLabel: vi.fn(async () => ({ success: true, label_url: 'https://labels/1.pdf' })),
  };
  const fakeDb = () => ({
    from: (table: string) => {
      const b: any = {
        select: () => b, eq: () => b,
        maybeSingle: async () => ({ data: table === 'orders' ? order : null, error: null }),
        update: (p: any) => { updates.push(p); Object.assign(order, p); return b; },
        then: (r: any) => r({ data: null, error: null }),
      };
      return b;
    },
  });

  beforeEach(() => {
    order = structuredClone(baseOrder);
    updates = [];
    vi.clearAllMocks();
  });

  it('creates the shipment, auto-assigns a courier, schedules pickup and saves the label', async () => {
    const r = await bookShipment(fakeDb(), 'o1', 'ravi@x.com', settings, api);
    expect(r).toEqual({ status: 'ready' });
    expect(order).toMatchObject({
      shiprocket_order_id: '111', shiprocket_shipment_id: '222', tracking_number: 'AWB123',
      courier_name: 'Delhivery Surface', shipping_label_url: 'https://labels/1.pdf', shipping_error: null,
    });
    expect(api.assignAwb).toHaveBeenCalledWith('222');
    expect(api.schedulePickup).toHaveBeenCalledWith('222');
  });

  it('with auto-assign off, only creates the order in Shiprocket (admin picks the courier there)', async () => {
    const r = await bookShipment(fakeDb(), 'o1', 'ravi@x.com', { ...settings, auto_assign: false }, api);
    expect(r).toEqual({ status: 'created' });
    expect(api.assignAwb).not.toHaveBeenCalled();
    expect(order.shiprocket_shipment_id).toBe('222');
  });

  it('never creates a second Shiprocket order on retry — it continues from where it stopped', async () => {
    order.shiprocket_shipment_id = '222';
    await bookShipment(fakeDb(), 'o1', 'ravi@x.com', settings, api);
    expect(api.createOrder).not.toHaveBeenCalled();
    expect(api.assignAwb).toHaveBeenCalledWith('222');
  });

  it('does nothing for an order that already has a courier and tracking number', async () => {
    Object.assign(order, { shiprocket_shipment_id: '222', tracking_number: 'AWB123' });
    expect(await bookShipment(fakeDb(), 'o1', 'ravi@x.com', settings, api)).toEqual({ status: 'ready' });
    expect(api.createOrder).not.toHaveBeenCalled();
    expect(api.assignAwb).not.toHaveBeenCalled();
  });

  it('saves a readable error for the admin when Shiprocket refuses', async () => {
    (api.createOrder as any).mockResolvedValueOnce({ success: false, error: 'Wrong Pickup location entered.' });
    const r = await bookShipment(fakeDb(), 'o1', 'ravi@x.com', settings, api);
    expect(r).toEqual({ status: 'failed', error: 'Wrong Pickup location entered.' });
    expect(order.shipping_error).toMatch(/Wrong Pickup location/);
  });

  it('if no courier could be assigned, the shipment still exists and the error says so', async () => {
    (api.assignAwb as any).mockResolvedValueOnce({ success: false, error: 'Insufficient wallet balance' });
    const r = await bookShipment(fakeDb(), 'o1', 'ravi@x.com', settings, api);
    expect(r.status).toBe('created');
    expect(order.shiprocket_shipment_id).toBe('222');
    expect(order.shipping_error).toMatch(/Insufficient wallet balance/);
  });

  it('skips cancelled orders and unpaid online orders', async () => {
    order.status = 'cancelled';
    expect((await bookShipment(fakeDb(), 'o1', 'a@b.c', settings, api)).status).toBe('skipped');
    order = { ...structuredClone(baseOrder), status: 'pending', payment_method: 'card', payment_status: 'pending' };
    expect((await bookShipment(fakeDb(), 'o1', 'a@b.c', settings, api)).status).toBe('skipped');
    expect(api.createOrder).not.toHaveBeenCalled();
  });
});
