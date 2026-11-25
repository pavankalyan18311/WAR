import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';

vi.mock('@/lib/supabase/queries', () => ({
  syncCartItemToDb: async () => true, removeCartItemFromDb: async () => true, clearCartInDb: async () => true, fetchUserCartFromDb: async () => [],
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));

import { useCartStore } from '@/store/cartStore';
import { useCartQuoteSync } from '@/lib/checkout/useCartQuoteSync';

function Probe({ enabled = true }: { enabled?: boolean }) {
  useCartQuoteSync(enabled);
  return null;
}

const item = (id: string, quantity: number) => ({
  cart_item_id: `ci-${id}`, variant_id: id, quantity, price: 500,
  product: { product_id: id, name: id }, variant: { variant_id: id, stock_quantity: 10 },
}) as any;

describe('useCartQuoteSync', () => {
  const refreshQuote = vi.fn(async () => null);
  beforeEach(() => {
    vi.useFakeTimers();
    refreshQuote.mockClear();
    useCartStore.setState({ items: [item('a', 1)], couponCode: '', refreshQuote } as any);
  });
  afterEach(() => vi.useRealTimers());

  it('checks the cart with the server once, shortly after it opens', async () => {
    render(<Probe />);
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(refreshQuote).toHaveBeenCalledTimes(1);
  });

  it('re-checks after quantities change (debounced, not on every click)', async () => {
    render(<Probe />);
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    act(() => {
      useCartStore.setState({ items: [item('a', 2)] });
      useCartStore.setState({ items: [item('a', 3)] });
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(refreshQuote).toHaveBeenCalledTimes(2);
  });

  it('does nothing while disabled (e.g. the bag is closed)', async () => {
    render(<Probe enabled={false} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(refreshQuote).not.toHaveBeenCalled();
  });
});
