import { beforeEach, describe, expect, it, vi } from 'vitest';

const syncCartItemToDb = vi.fn(async () => true);
vi.mock('@/lib/supabase/queries', () => ({
  syncCartItemToDb: (...a: any[]) => (syncCartItemToDb as any)(...a),
  removeCartItemFromDb: vi.fn(async () => true),
  clearCartInDb: vi.fn(async () => true),
  fetchUserCartFromDb: vi.fn(async () => []),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));

import { useCartStore } from '@/store/cartStore';

const item = (id: string, qty: number, price = 500, name = `Tee ${id}`) => ({
  cart_item_id: `ci-${id}`, variant_id: id, quantity: qty, price,
  product: { product_id: `p-${id}`, name, slug: id, price, images: [] },
  variant: { variant_id: id, size: 'M', color: '', price, stock_quantity: 50 },
}) as any;

const line = (variant_id: string, over: any = {}) => ({
  variant_id, status: 'ok', requested: 1, quantity: 1, available: 10, unit_price: 500, name: `Tee ${variant_id}`, ...over,
});

let quote: any;
const fetchMock = vi.fn(async () => ({ ok: true, json: async () => quote }));

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockClear();
  syncCartItemToDb.mockClear();
  useCartStore.setState({
    items: [], couponCode: '', discount: 0, discountType: null, userId: null, lineIssues: {}, notices: [],
    shippingSettings: { free_shipping_threshold: 1500, shipping_fee: 99, cod_enabled: true }, // same settings the server uses
  } as any);
});

describe('cart ↔ server quote', () => {
  it('takes the current price from the server', async () => {
    useCartStore.setState({ items: [item('a', 2, 500)] });
    quote = { lines: [line('a', { requested: 2, quantity: 2, unit_price: 650 })], totals: { subtotal: 1300, discount: 0, shipping: 99, tax: 0, total: 1399 }, coupon: null, canCheckout: true };

    await useCartStore.getState().refreshQuote();

    const s = useCartStore.getState();
    expect(s.items[0].price).toBe(650);
    expect(s.getSummary().total).toBe(1399);
    expect(s.notices).toContain('The price of Tee a changed to ₹650.');
    expect(fetchMock).toHaveBeenCalledWith('/api/orders/quote', expect.objectContaining({ method: 'POST' }));
  });

  it('reduces quantity to the stock left (and saves it), and flags sold-out / unavailable items', async () => {
    useCartStore.setState({ userId: 'me', items: [item('a', 5), item('b', 1)] });
    quote = {
      lines: [line('a', { status: 'reduced', requested: 5, quantity: 2, available: 2 }), line('b', { status: 'unavailable', quantity: 0, available: 0 })],
      totals: { subtotal: 1000, discount: 0, shipping: 99, tax: 0, total: 1099 }, coupon: null, canCheckout: false,
    };

    await useCartStore.getState().refreshQuote();

    const s = useCartStore.getState();
    expect(s.items.find((i) => i.variant_id === 'a')!.quantity).toBe(2);
    expect(s.items.find((i) => i.variant_id === 'a')!.variant.stock_quantity).toBe(2);
    expect(syncCartItemToDb).toHaveBeenCalledWith('me', 'a', 2);
    expect(s.lineIssues).toEqual({ a: 'Only 2 left — quantity reduced', b: 'No longer available' });
    expect(s.hasBlockingIssues()).toBe(true);
  });

  it('removes a coupon that no longer applies and says why', async () => {
    useCartStore.setState({ items: [item('a', 1)], couponCode: 'SAVE10', discount: 100, discountType: 'percentage' });
    quote = {
      lines: [line('a')], totals: { subtotal: 500, discount: 0, shipping: 99, tax: 0, total: 599 },
      coupon: { code: 'SAVE10', ok: false, error: 'Minimum order of ₹1000 required for this coupon.' }, canCheckout: true,
    };

    await useCartStore.getState().refreshQuote();

    const s = useCartStore.getState();
    expect(s.couponCode).toBe('');
    expect(s.discount).toBe(0);
    expect(s.notices).toContain('Coupon SAVE10 was removed: Minimum order of ₹1000 required for this coupon.');
  });

  it('keeps a valid coupon but uses the server discount amount', async () => {
    useCartStore.setState({ items: [item('a', 3)], couponCode: 'SAVE10', discount: 999, discountType: 'percentage' });
    quote = {
      lines: [line('a', { requested: 3, quantity: 3 })], totals: { subtotal: 1500, discount: 150, shipping: 0, tax: 0, total: 1350 },
      coupon: { code: 'SAVE10', ok: true, error: null }, canCheckout: true,
    };
    await useCartStore.getState().refreshQuote();
    expect(useCartStore.getState().discount).toBe(150);
    expect(useCartStore.getState().getSummary().total).toBe(1350);
  });

  it('a network error leaves the cart untouched', async () => {
    useCartStore.setState({ items: [item('a', 2)] });
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect(await useCartStore.getState().refreshQuote()).toBeNull();
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });
});

describe('quantity stepper', () => {
  it('never goes below 1 or above stock, even when stock is 0', () => {
    useCartStore.setState({ items: [{ ...item('a', 2), variant: { ...item('a', 2).variant, stock_quantity: 3 } }] });
    useCartStore.getState().updateQuantity('ci-a', 10);
    expect(useCartStore.getState().items[0].quantity).toBe(3);

    useCartStore.setState({ items: [{ ...item('a', 2), variant: { ...item('a', 2).variant, stock_quantity: 0 } }] });
    useCartStore.getState().updateQuantity('ci-a', 3);
    expect(useCartStore.getState().items[0].quantity).toBe(2); // no change to an invalid 0
  });
});
