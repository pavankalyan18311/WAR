// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendEmail = vi.fn(async (_msg: any) => ({ sent: true }) as any);
vi.mock('@/lib/mailer', () => ({ sendEmail: (m: any) => sendEmail(m) }));

import { sendOrderEmail } from '@/lib/email/orderEmails';

const ORDER = {
  id: 'abcd1234-0000-0000-0000-000000000000', user_id: 'u1', subtotal: 999, discount: 0, shipping: 0, total: 999,
  payment_method: 'razorpay', shipping_address: { full_name: 'Ravi', city: 'Pune' },
  order_items: [
    { id: 'i1', quantity: 1, unit_price: 999, status: 'active',
      product: { name: 'Oversized Tee', slug: 'oversized-tee' },
      variant: { color: { name: 'Black' }, size_option: { name: 'L' } } },
  ],
};

let log: string[];
let logError: any;
function fakeDb() {
  return {
    from: (table: string) => {
      const b: any = {
        select: () => b, eq: () => b,
        maybeSingle: async () => (table === 'orders' ? { data: ORDER, error: null } : { data: { email: 'ravi@x.com', name: 'Ravi K' }, error: null }),
        insert: async (row: any) => {
          if (logError) return { error: logError };
          if (log.includes(row.key)) return { error: { code: '23505' } };
          log.push(row.key);
          return { error: null };
        },
        delete: () => ({ eq: async (_k: string, v: string) => { log = log.filter((k) => k !== v); return { error: null }; } }),
      };
      return b;
    },
  };
}

describe('sendOrderEmail', () => {
  beforeEach(() => { log = []; logError = null; sendEmail.mockClear(); sendEmail.mockResolvedValue({ sent: true }); });

  it('sends the order confirmation to the customer', async () => {
    await sendOrderEmail(fakeDb(), ORDER.id, { kind: 'order_placed' });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const msg = sendEmail.mock.calls[0][0];
    expect(msg.to).toBe('ravi@x.com');
    expect(msg.subject).toContain('Order confirmed');
    expect(msg.html).toContain('Size L');
  });

  it('sends each email only once, even if triggered twice (e.g. a repeated webhook)', async () => {
    const db = fakeDb();
    await sendOrderEmail(db, ORDER.id, { kind: 'order_delivered' });
    await sendOrderEmail(db, ORDER.id, { kind: 'order_delivered' });
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('allows a retry later when sending failed', async () => {
    const db = fakeDb();
    sendEmail.mockResolvedValueOnce({ sent: false, reason: 'SMTP down' });
    await sendOrderEmail(db, ORDER.id, { kind: 'order_placed' });
    await sendOrderEmail(db, ORDER.id, { kind: 'order_placed' });
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it('sends a cancellation per item, with the refund amount', async () => {
    await sendOrderEmail(fakeDb(), ORDER.id, { kind: 'item_cancelled', itemId: 'i1', refundAmount: 999 });
    expect(sendEmail.mock.calls[0][0].html).toContain('₹999');
  });

  it('never throws, even if the database is unavailable', async () => {
    const broken = { from: () => { throw new Error('db down'); } };
    await expect(sendOrderEmail(broken, ORDER.id, { kind: 'order_placed' })).resolves.toBeUndefined();
  });
});
