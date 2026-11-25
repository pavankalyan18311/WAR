import { afterEach, describe, expect, it, vi } from 'vitest';
import { CheckoutRequestError, guardSingleFlight, placeCodOrder } from '@/lib/checkout/client';

const body = { items: [{ variant_id: 'v1', quantity: 1 }], coupon_code: '', shipping_address: {} as any };
afterEach(() => vi.restoreAllMocks());

describe('checkout request errors carry the HTTP status', () => {
  it('401 (session expired) is recognisable so the page can send the customer to sign in', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"error":"Please sign in to continue."}', { status: 401 }));
    const err = await placeCodOrder(body).catch((e) => e);
    expect(err).toBeInstanceOf(CheckoutRequestError);
    expect(err.status).toBe(401);
    expect(err.message).toBe('Please sign in to continue.');
  });

  it('400/409 (cart problem) keep the server message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"error":"Some items just sold out. Please review your cart."}', { status: 409 }));
    const err = await placeCodOrder(body).catch((e) => e);
    expect(err.status).toBe(409);
    expect(err.message).toMatch(/sold out/);
  });

  it('a network failure gives a friendly message', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await placeCodOrder(body).catch((e) => e);
    expect(err.message).toBe('Could not reach the store. Check your internet connection and try again.');
  });
});

describe('guardSingleFlight', () => {
  it('ignores a second click while the first order is still being placed', async () => {
    let resolve!: () => void;
    const work = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
    const run = guardSingleFlight(work);

    const first = run();
    const second = run();
    expect(work).toHaveBeenCalledTimes(1);
    expect(await second).toBe(false);

    resolve();
    expect(await first).toBe(true);
    const third = run(); // allowed again once finished
    expect(work).toHaveBeenCalledTimes(2);
    resolve();
    expect(await third).toBe(true);
  });

  it('allows a retry after a failure', async () => {
    const work = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
    const run = guardSingleFlight(work);
    await expect(run()).rejects.toThrow('boom');
    expect(await run()).toBe(true);
  });
});
