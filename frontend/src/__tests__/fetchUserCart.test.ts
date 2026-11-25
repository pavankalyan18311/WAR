import { describe, expect, it, vi } from 'vitest';

let cartItems: any[] = [];
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => {
      const b: any = {
        select: () => b, eq: () => b, insert: () => b, order: () => b, limit: () => b,
        single: async () => ({ data: { id: 'cart1' }, error: null }),
        maybeSingle: async () => ({ data: { id: 'cart1' }, error: null }),
        then: (r: any) => r({ data: table === 'cart_items' ? cartItems : [], error: null }),
      };
      return b;
    },
  }),
}));

import { fetchUserCartFromDb } from '@/lib/supabase/queries';

describe('fetchUserCartFromDb', () => {
  it('uses the real stock left (not a made-up number) so the quantity stepper respects it', async () => {
    cartItems = [{
      id: 'ci1', quantity: 1,
      variant: {
        id: 'v1', product_id: 'p1', sku: 'S', price: 799, status: 'active',
        size_option: { name: 'M' }, color: null, inventory: [{ quantity: 4, reserved_quantity: 1 }],
        product: { id: 'p1', name: 'Tee', slug: 'tee', status: 'active' },
      },
    }];
    const [item] = await fetchUserCartFromDb('me');
    expect(item.variant.stock_quantity).toBe(3);
  });

  it('treats a variant with no inventory row as out of stock', async () => {
    cartItems = [{
      id: 'ci1', quantity: 1,
      variant: { id: 'v1', product_id: 'p1', sku: 'S', price: 799, status: 'active', product: { id: 'p1', name: 'Tee', slug: 'tee' } },
    }];
    const [item] = await fetchUserCartFromDb('me');
    expect(item.variant.stock_quantity).toBe(0);
  });
});
