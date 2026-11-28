import { describe, expect, it } from 'vitest';
import { normalizeProduct, getPublicStorageUrl } from '@/lib/supabase/queries';

const row = {
  id: 'p1', name: 'Black Tee', slug: 'black-tee', status: 'active',
  product_collections: [{ collection_id: 'c1' }, { collection_id: 'c2' }],
  product_media: [],
  product_variants: [],
};

describe('normalizeProduct', () => {
  it('exposes the collections a product belongs to', () => {
    expect(normalizeProduct(row).collection_ids).toEqual(['c1', 'c2']);
  });

  it('exposes the size chart chosen for the product (null = store default)', () => {
    expect(normalizeProduct({ ...row, size_chart_id: 'chart-1' }).size_chart_id).toBe('chart-1');
    expect(normalizeProduct(row).size_chart_id).toBeNull();
  });

  it('a product without colours has no colour options (never a made-up "Default")', () => {
    const p = normalizeProduct({
      ...row,
      product_variants: [{ id: 'v1', color_id: null, color: null, size_option_id: 's', size_option: { name: 'M' }, price: 799, status: 'active', inventory: { quantity: 3 } }],
    });
    expect(p.colors).toEqual([]);
    expect(p.variants[0]).toMatchObject({ color: '', size: 'M' });
  });

  it('has no collections when the relation is missing', () => {
    expect(normalizeProduct({ ...row, product_collections: undefined }).collection_ids).toEqual([]);
  });

  it('has no images (not stock photos) when none were uploaded', () => {
    expect(normalizeProduct(row).images).toEqual([]);
  });

  it('never invents a rating or review count', () => {
    const p = normalizeProduct(row);
    expect(p.rating).toBeUndefined();
    expect(p.review_count).toBeUndefined();
  });
});

describe('getPublicStorageUrl', () => {
  it('returns an empty string instead of a stock photo for a missing path', () => {
    expect(getPublicStorageUrl(null, 'p1')).toBe('');
    expect(getPublicStorageUrl('', 'p1')).toBe('');
  });
});

describe('normalizeProduct — size order', () => {
  it('lists sizes in the size list order (S, M, L, XL), whatever order the variants come back in', () => {
    const size = (name: string, sort_order: number) => ({ id: `s-${name}`, name, sort_order });
    const variant = (name: string, sort_order: number) => ({
      id: `v-${name}`, price: 1199, size_option_id: `s-${name}`, size_option: size(name, sort_order), inventory: { quantity: 10 },
    });
    const p = normalizeProduct({ ...row, product_variants: [variant('S', 2), variant('L', 4), variant('XL', 5), variant('M', 3)] });
    expect(p.sizes.map((s: { name: string }) => s.name)).toEqual(['S', 'M', 'L', 'XL']);
  });
});
