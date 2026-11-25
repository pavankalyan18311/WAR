import { describe, expect, it, vi } from 'vitest';
import { toAdminProductRow } from '@/lib/admin/products';

const product = {
  id: 'p1', name: 'Tee', slug: 'tee', status: 'active',
  product_categories: [{ category: { name: 'Oversized' } }],
  product_media: [{ storage_path: 'https://x/b.jpg', sort_order: 1 }, { storage_path: 'https://x/a.jpg', sort_order: 0 }],
  product_variants: [
    { status: 'active', price: 999, compare_at_price: 1299, inventory: [{ quantity: 5 }] },
    { status: 'active', price: 899, compare_at_price: null, inventory: { quantity: 2 } },
    { status: 'inactive', price: 100, compare_at_price: null, inventory: [{ quantity: 50 }] },
  ],
};

describe('toAdminProductRow', () => {
  it('uses real prices, stock, category, image and sales', () => {
    expect(toAdminProductRow(product, new Map([['p1', 7]]))).toEqual({
      id: 'p1', name: 'Tee', slug: 'tee', status: 'active',
      category: 'Oversized', image: 'https://x/a.jpg',
      price: 899, stock: 7, variants: 2, sales: 7,
    });
  });

  it('turns older relative storage paths into full public image URLs', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co');
    const row = toAdminProductRow({ ...product, product_media: [{ storage_path: 'p1/front.png', sort_order: 0 }] }, new Map());
    expect(row.image).toBe('https://abc.supabase.co/storage/v1/object/public/products/p1/front.png');
    vi.unstubAllEnvs();
  });

  it('leaves blanks blank instead of inventing values', () => {
    const row = toAdminProductRow({ id: 'p2', name: 'New', slug: 'new', status: 'draft' }, new Map());
    expect(row).toMatchObject({ category: null, image: '', price: null, stock: 0, variants: 0, sales: 0 });
  });
});
