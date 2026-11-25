import { describe, expect, it } from 'vitest';
import { toAdminOrderRow, ordersToCsv } from '@/lib/admin/orders';

const order = {
  id: 'abcdef12-3456-7890-abcd-ef1234567890',
  created_at: '2026-10-07T10:00:00Z',
  status: 'confirmed', payment_method: 'upi', payment_status: 'paid',
  total: 1798, tracking_number: null,
  shipping_address: { full_name: 'Asha Rao', phone: '9876501234', address_line_1: '12 MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
  profile: { email: 'asha@example.com' },
  order_items: [
    { id: 'i1', quantity: 2, unit_price: 899, total_price: 1798, status: 'active', product: { name: 'Black Tee' }, variant: { color: { name: 'Black' }, size_option: { name: 'M' } } },
    { id: 'i2', quantity: 1, unit_price: 500, total_price: 500, status: 'cancelled', product: { name: 'Cap' }, variant: null },
  ],
};

describe('shipment details for Admin → Orders', () => {
  it('exposes courier, label, Shiprocket ids and any booking problem', () => {
    const row = toAdminOrderRow({ ...order, tracking_number: 'AWB1', courier_name: 'Delhivery', shipping_label_url: 'https://l/1.pdf', shiprocket_shipment_id: '222', shipping_error: null });
    expect(row).toMatchObject({ tracking: 'AWB1', courier: 'Delhivery', labelUrl: 'https://l/1.pdf', inShiprocket: true, shippingError: '' });
    expect(toAdminOrderRow({ ...order, shipping_error: 'Wrong Pickup location entered.' })).toMatchObject({ inShiprocket: false, shippingError: 'Wrong Pickup location entered.' });
  });
});

describe('abandoned payments', () => {
  it('flags online orders whose payment was never completed', () => {
    expect(toAdminOrderRow({ ...order, status: 'pending', payment_method: 'razorpay', payment_status: 'pending' }).abandoned).toBe(true);
    expect(toAdminOrderRow({ ...order, status: 'pending', payment_method: 'razorpay', payment_status: 'failed' }).abandoned).toBe(true);
  });
  it('never flags paid orders or cash on delivery', () => {
    expect(toAdminOrderRow(order).abandoned).toBe(false);
    expect(toAdminOrderRow({ ...order, status: 'confirmed', payment_method: 'cod', payment_status: 'pending' }).abandoned).toBe(false);
    expect(toAdminOrderRow({ ...order, status: 'pending', payment_method: 'cod', payment_status: 'pending' }).abandoned).toBe(false);
  });
});

describe('toAdminOrderRow', () => {
  it('maps the real order fields', () => {
    expect(toAdminOrderRow(order)).toMatchObject({
      id: order.id,
      reference: 'WAR-ABCDEF12',
      date: '2026-10-07',
      customer: 'Asha Rao',
      email: 'asha@example.com',
      phone: '9876501234',
      address: '12 MG Road, Bengaluru, Karnataka - 560001',
      units: 2,
      total: 1798,
      status: 'confirmed',
      payment: 'UPI (paid)',
      items: [
        { id: 'i1', name: 'Black Tee', variant: 'Black / M', quantity: 2, total: 1798, cancelled: false },
        { id: 'i2', name: 'Cap', variant: '', quantity: 1, total: 500, cancelled: true },
      ],
    });
  });

  it('leaves missing details blank instead of inventing them', () => {
    const row = toAdminOrderRow({ ...order, shipping_address: null, profile: null, order_items: [] });
    expect(row).toMatchObject({ customer: '', email: '', phone: '', address: '', units: 0, items: [] });
  });
});

describe('ordersToCsv', () => {
  it('builds a CSV with a header and escapes commas and quotes', () => {
    const csv = ordersToCsv([toAdminOrderRow({ ...order, shipping_address: { ...order.shipping_address, full_name: 'Rao, "Asha"' } })]);
    const [header, line] = csv.split('\n');
    expect(header).toBe('Reference,Date,Customer,Email,Phone,Address,Units,Total,Status,Payment,Tracking');
    expect(line).toContain('"Rao, ""Asha"""');
    expect(line).toContain(',1798,confirmed,UPI (paid),');
  });
});
