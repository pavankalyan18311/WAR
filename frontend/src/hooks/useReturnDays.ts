'use client';

import { useCartStore } from '@/store/cartStore';
import { DEFAULT_RETURN_DAYS } from '@/lib/checkout/storeSettings';

/** Return / size-exchange window in days, as set in Admin → Settings (7 until the settings load). */
export function useReturnDays(): number {
  return useCartStore((s) => s.shippingSettings.return_days ?? DEFAULT_RETURN_DAYS);
}
