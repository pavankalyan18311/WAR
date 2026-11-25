'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/store/cartStore';

const DEBOUNCE_MS = 400;

/**
 * Keeps the cart in step with the server: shortly after the cart is shown, and whenever its
 * items, quantities or coupon change, it re-checks prices, stock and the coupon (debounced).
 */
export function useCartQuoteSync(enabled = true) {
  const signature = useCartStore((s) =>
    `${s.couponCode}|${s.items.map((i) => `${i.variant_id || i.variant?.variant_id}:${i.quantity}`).join(',')}`,
  );
  const refreshQuote = useCartStore((s) => s.refreshQuote);

  useEffect(() => {
    if (!enabled || signature.endsWith('|')) return; // nothing in the cart
    const timer = setTimeout(() => { refreshQuote(); }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [enabled, signature, refreshQuote]);
}
