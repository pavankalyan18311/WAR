import { describe, expect, it, vi } from 'vitest';

const recordCouponUsage = vi.fn();
vi.mock('@/lib/coupon', () => ({ recordCouponUsage: (...a: any[]) => recordCouponUsage(...a) }));
vi.mock('@/lib/shiprocket', () => ({ createShiprocketOrder: async () => ({ success: false, error: 'test' }) }));
const sendOrderEmail = vi.fn();
vi.mock('@/lib/email/orderEmails', () => ({ sendOrderEmail: (...a: any[]) => sendOrderEmail(...a) }));

import { afterOrderConfirmed } from '@/lib/checkout/fulfil';

describe('afterOrderConfirmed', () => {
  it('emails the order confirmation to the customer', async () => {
    const db = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) };
    await afterOrderConfirmed(db, { id: 'o1', userId: 'u1', couponCode: null, customerEmail: 'a@b.com' });
    expect(sendOrderEmail).toHaveBeenCalledWith(db, 'o1', { kind: 'order_placed' });
  });
});
