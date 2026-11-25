import type { CartItem } from '@/types';
import type { ShippingAddress } from './address';

export interface CheckoutBody {
  items: { variant_id: string; quantity: number }[];
  coupon_code: string;
  shipping_address: ShippingAddress;
  /** Reward points the customer chose to use (the server checks the real balance). */
  points_to_use?: number;
}

/** What the browser sends at checkout: which variants and how many. Prices are decided by the server. */
export function buildCheckoutBody(items: CartItem[], couponCode: string, address: ShippingAddress, pointsToUse = 0): CheckoutBody {
  return {
    ...(pointsToUse > 0 ? { points_to_use: Math.floor(pointsToUse) } : {}),
    items: items.map((it) => ({
      variant_id: (it.variant_id || it.variant?.variant_id) as string,
      quantity: it.quantity,
    })),
    coupon_code: couponCode.trim(),
    shipping_address: address,
  };
}

/** A failed checkout request; `status` lets the page react (401 → sign in again, 400/409 → refresh the cart). */
export class CheckoutRequestError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function postJson(url: string, body: unknown) {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new CheckoutRequestError('Could not reach the store. Check your internet connection and try again.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new CheckoutRequestError(data.error || 'Something went wrong. Please try again.', res.ok ? 400 : res.status);
  }
  return data;
}

/**
 * Wraps an async action so repeated clicks while it is running are ignored (no duplicate orders).
 * Resolves true when the action ran, false when the click was ignored.
 */
export function guardSingleFlight(action: () => Promise<void>): () => Promise<boolean> {
  let running = false;
  return async () => {
    if (running) return false;
    running = true;
    try {
      await action();
      return true;
    } finally {
      running = false;
    }
  };
}

export async function placeCodOrder(body: CheckoutBody): Promise<{ orderId: string; total: number }> {
  const data = await postJson('/api/orders', body);
  return { orderId: data.order_id, total: data.totals.total };
}

/** Opens the Razorpay window (window.Razorpay in the browser); injectable for tests. */
export type OpenCheckout = (options: any) => void;

export async function startOnlinePayment(
  body: CheckoutBody,
  prefill: { name?: string; email?: string; contact?: string },
  openCheckout: OpenCheckout,
): Promise<{ orderId: string; paymentId: string; total: number }> {
  const order = await postJson('/api/payments/razorpay/create-order', body);

  const response = await new Promise<{ razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }>(
    (resolve, reject) => {
      openCheckout({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.razorpay_order_id,
        name: 'WAR — Without Any Regrets',
        description: `Order ${order.order_id.slice(0, 8).toUpperCase()}`,
        prefill,
        theme: { color: '#000000' },
        handler: resolve,
        modal: {
          ondismiss: () => {
            // Give back any reward points held for this unpaid order (best-effort).
            if (order.points_used > 0) {
              fetch('/api/orders/release-points', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: order.order_id }),
              }).catch(() => {});
            }
            reject(new Error('Payment was cancelled. Your order has not been placed.'));
          },
        },
      });
    },
  );

  await postJson('/api/payments/razorpay/verify-payment', { order_id: order.order_id, ...response });
  return { orderId: order.order_id, paymentId: response.razorpay_payment_id, total: order.totals.total };
}

/** Short, readable order reference shown to customers (derived from the real order id). */
export const orderReference = (orderId: string) => `WAR-${orderId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
