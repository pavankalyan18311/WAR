'use client';

import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';

/** Shipping rules text, always reflecting the admin's current store settings. */
export default function ShippingNote({ variant = 'short' }: { variant?: 'short' | 'full' | 'badge' }) {
  const { free_shipping_threshold, shipping_fee } = useCartStore((s) => s.shippingSettings);
  const threshold = formatPrice(free_shipping_threshold);

  if (variant === 'badge') return <>Free Shipping {threshold}+</>;
  if (variant === 'full') {
    return (
      <>
        Free shipping on all orders above {threshold}. Orders below {threshold} have a flat {formatPrice(shipping_fee)} shipping fee.
      </>
    );
  }
  return <>Free shipping on orders above {threshold}</>;
}
