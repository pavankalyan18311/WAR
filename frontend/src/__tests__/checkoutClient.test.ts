import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCheckoutBody, placeCodOrder, startOnlinePayment } from '@/lib/checkout/client';

const cartItems = [
  { variant_id: 'v1', quantity: 2, price: 1, product: { name: 'Tee' } },
  { variant: { variant_id: 'v2' }, quantity: 1, price: 1, product: { name: 'Hoodie' } },
] as any[];
const address = {
  full_name: 'Asha Rao', phone: '9876501234', address_line_1: '12 MG Road', address_line_2: '',
  city: 'Bengaluru', state: 'Karnataka', pincode: '560001', country: 'India',
};

afterEach(() => vi.restoreAllMocks());

describe('buildCheckoutBody', () => {
  it('sends only variant ids and quantities — never prices or totals', () => {
    expect(buildCheckoutBody(cartItems, ' war10 ', address)).toEqual({
      items: [{ variant_id: 'v1', quantity: 2 }, { variant_id: 'v2', quantity: 1 }],
      coupon_code: 'war10',
      shipping_address: address,
    });
  });
});

describe('buildCheckoutBody — reward points', () => {
  it('adds points_to_use only when the customer chose to use points', () => {
    expect(buildCheckoutBody(cartItems, '', address, 250)).toMatchObject({ points_to_use: 250 });
    expect(buildCheckoutBody(cartItems, '', address, 0)).not.toHaveProperty('points_to_use');
  });
});

describe('placeCodOrder', () => {
  it('returns the server order id', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, order_id: 'o1', totals: { total: 898 } }), { status: 200 }),
    );
    expect(await placeCodOrder(buildCheckoutBody(cartItems, '', address))).toEqual({ orderId: 'o1', total: 898 });
    expect(fetchSpy).toHaveBeenCalledWith('/api/orders', expect.objectContaining({ method: 'POST' }));
  });

  it('throws the server error message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Some items just sold out.' }), { status: 409 }),
    );
    await expect(placeCodOrder(buildCheckoutBody(cartItems, '', address))).rejects.toThrow('Some items just sold out.');
  });
});

describe('startOnlinePayment', () => {
  it('opens Razorpay with the server amount and verifies with our order id', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        order_id: 'o1', razorpay_order_id: 'rzp_1', amount: 89800, currency: 'INR', key_id: 'key', totals: { total: 898 },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, order_id: 'o1' }), { status: 200 }));

    const openCheckout = vi.fn((opts: any) =>
      opts.handler({ razorpay_order_id: 'rzp_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig' }));

    const result = await startOnlinePayment(buildCheckoutBody(cartItems, '', address), { name: 'Asha', email: 'a@b.c', contact: '9876501234' }, openCheckout);

    expect(openCheckout).toHaveBeenCalledWith(expect.objectContaining({ key: 'key', amount: 89800, order_id: 'rzp_1' }));
    expect(JSON.parse(fetchSpy.mock.calls[1][1]!.body as string)).toEqual({
      order_id: 'o1', razorpay_order_id: 'rzp_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig',
    });
    expect(result).toEqual({ orderId: 'o1', paymentId: 'pay_1', total: 898 });
  });

  it('rejects when the customer closes the payment window', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      order_id: 'o1', razorpay_order_id: 'rzp_1', amount: 100, currency: 'INR', key_id: 'key', totals: { total: 1 },
    }), { status: 200 }));
    const openCheckout = vi.fn((opts: any) => opts.modal.ondismiss());
    await expect(startOnlinePayment(buildCheckoutBody(cartItems, '', address), {}, openCheckout))
      .rejects.toThrow('Payment was cancelled');
  });

  it('closing the payment window gives the held reward points back', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        order_id: 'o1', razorpay_order_id: 'rzp_1', amount: 100, currency: 'INR', key_id: 'key', totals: { total: 1 }, points_used: 50,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ restored: 50 }), { status: 200 }));
    const openCheckout = vi.fn((opts: any) => opts.modal.ondismiss());
    await expect(startOnlinePayment(buildCheckoutBody(cartItems, '', address, 50), {}, openCheckout)).rejects.toThrow('Payment was cancelled');
    expect(fetchSpy).toHaveBeenCalledWith('/api/orders/release-points', expect.objectContaining({ method: 'POST', body: JSON.stringify({ order_id: 'o1' }) }));
  });
});
