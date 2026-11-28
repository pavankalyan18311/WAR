import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCartStore } from '@/store/cartStore';
import { useReturnDays } from '@/hooks/useReturnDays';

describe('useReturnDays', () => {
  beforeEach(() => useCartStore.setState({ shippingSettings: { free_shipping_threshold: 1500, shipping_fee: 99, cod_enabled: true } }));

  it('is 7 days until the store settings have loaded', () => {
    expect(renderHook(() => useReturnDays()).result.current).toBe(7);
  });

  it('follows the return window set in Admin → Settings', () => {
    useCartStore.setState({ shippingSettings: { free_shipping_threshold: 1500, shipping_fee: 99, cod_enabled: true, return_days: 10 } });
    expect(renderHook(() => useReturnDays()).result.current).toBe(10);
  });
});
