import { describe, expect, it } from 'vitest';
import { backInStockEmail, itemCancelledEmail, orderDeliveredEmail, orderPlacedEmail, type OrderEmailData } from '@/lib/email/templates';

describe('delivered email — reward points', () => {
  const base = {
    orderId: 'abcd1234-0000-0000-0000-000000000000', customerName: 'Ravi', items: [], subtotal: 999, discount: 0, shipping: 0, total: 999,
    paymentMethod: 'cod', address: {}, siteUrl: 'https://shop.test',
  };
  it('tells the customer how many points they earned and how long they last', () => {
    const e = orderDeliveredEmail({ ...base, pointsEarned: 37 });
    expect(e.html).toContain('37 reward points');
    expect(e.html).toContain('90 days');
    expect(e.text).toContain('37 reward points');
  });
  it('says nothing about points when none were earned', () => {
    expect(orderDeliveredEmail(base).html).not.toContain('reward points');
  });
});

describe('back in stock email', () => {
  it('names the product and size and links straight to it', () => {
    const e = backInStockEmail({ productName: 'Oversized <Tee>', size: 'M', color: 'Black', url: 'https://shop.test/products/tee' });
    expect(e.subject).toBe("It's back — Oversized <Tee> in size M");
    expect(e.html).toContain('Oversized &lt;Tee&gt;');
    expect(e.html).toContain('https://shop.test/products/tee');
    expect(e.text).toContain('https://shop.test/products/tee');
  });
});

const order: OrderEmailData = {
  orderId: 'abcd1234-0000-0000-0000-000000000000',
  customerName: '<script>Ravi Kumar',
  items: [
    { name: 'Oversized Tee', size: 'L', color: 'Black', quantity: 2, unitPrice: 999, slug: 'oversized-tee' },
    { name: 'Graphic Tee', size: 'M', color: 'White', quantity: 1, unitPrice: 799, slug: 'graphic-tee' },
  ],
  subtotal: 2797, discount: 100, shipping: 0, total: 2697,
  paymentMethod: 'cod',
  address: { full_name: 'Ravi', address_line_1: '12 MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
  siteUrl: 'https://war.example',
};

describe('order emails', () => {
  it('order placed: subject has the order reference; body lists items, totals and address', () => {
    const e = orderPlacedEmail(order);
    expect(e.subject).toContain('WAR-ABCD1234');
    for (const s of ['Oversized Tee', 'Size L', '₹2,697', '₹100', 'Free', '12 MG Road', 'Cash on delivery']) {
      expect(e.html).toContain(s);
    }
    expect(e.text).toContain('Total: ₹2,697');
    expect(e.html).toContain('https://war.example/account/orders/abcd1234-0000-0000-0000-000000000000');
  });

  it('escapes customer-provided text in HTML', () => {
    const { html } = orderPlacedEmail(order);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;Ravi');
  });

  it('delivered: asks for a review of each product with a direct link', () => {
    const e = orderDeliveredEmail(order);
    expect(e.subject.toLowerCase()).toContain('delivered');
    expect(e.html).toContain('https://war.example/products/oversized-tee?review=1#reviews');
    expect(e.html).toContain('https://war.example/products/graphic-tee?review=1#reviews');
    expect(e.text).toContain('https://war.example/products/oversized-tee?review=1#reviews');
  });

  it('cancelled: names the item and mentions the refund only for online payments', () => {
    const item = order.items[0];
    const refunded = itemCancelledEmail(order, item, 1998);
    expect(refunded.subject).toContain('cancelled');
    expect(refunded.html).toContain('Oversized Tee');
    expect(refunded.html).toContain('₹1,998');

    const cod = itemCancelledEmail(order, item, 0);
    expect(cod.html).not.toContain('refund of');
  });
});
