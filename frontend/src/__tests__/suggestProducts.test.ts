import { describe, it, expect } from 'vitest';
import { suggestProducts } from '@/lib/suggestProducts';

const p = (id: string, extra: Record<string, unknown> = {}) =>
  ({ product_id: id, id, name: id, slug: id, price: 999, is_in_stock: true, images: [], ...extra }) as any;

const current = p('cur', { category_id: 'tees', fit: 'oversized', gender: 'men', price: 1000, tags: ['graphic'], colors: [{ name: 'Black', hex: '#000' }] });

describe('suggestProducts ("You may also like")', () => {
  it('never suggests the product being viewed', () => {
    expect(suggestProducts(current, [current, p('a')]).map((x) => x.product_id)).toEqual(['a']);
  });

  it('puts the most similar products first', () => {
    const list = [
      p('other', { category_id: 'jeans', price: 3000 }),
      p('same-cat', { category_id: 'tees', price: 3000 }),
      p('twin', { category_id: 'tees', fit: 'oversized', gender: 'men', price: 1100, tags: ['graphic'], colors: [{ name: 'Black', hex: '#000' }] }),
    ];
    expect(suggestProducts(current, list).map((x) => x.product_id)).toEqual(['twin', 'same-cat', 'other']);
  });

  it('fills up with other products when few are similar', () => {
    const list = [p('x', { category_id: 'jeans' }), p('y', { category_id: 'shirts' })];
    expect(suggestProducts(current, list)).toHaveLength(2);
  });

  it('shows sold-out products last', () => {
    const list = [p('sold', { category_id: 'tees', is_in_stock: false }), p('avail', { category_id: 'jeans' })];
    expect(suggestProducts(current, list).map((x) => x.product_id)).toEqual(['avail', 'sold']);
  });

  it('respects the limit and skips duplicates', () => {
    const list = Array.from({ length: 12 }, (_, i) => p(`p${i}`));
    expect(suggestProducts(current, [...list, list[0]], 8)).toHaveLength(8);
    expect(new Set(suggestProducts(current, [...list, list[0]], 20).map((x) => x.product_id)).size).toBe(12);
  });
});
