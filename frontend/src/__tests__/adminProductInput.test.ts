import { describe, expect, it } from 'vitest';
import { parseProductInput, ProductInputError } from '@/lib/admin/products';

const valid = {
  name: '  Shadow Oversized Tee ',
  description: 'Heavy cotton tee',
  fabric: '100% Cotton', fit: 'Oversized', pattern: '', sleeve_type: '', neck_type: 'Crew', gender: 'unisex',
  status: 'active',
  category_ids: ['cat1'],
  collection_ids: ['col1'],
  images: ['https://abc.supabase.co/storage/v1/object/public/products/p/1.jpg'],
  variants: [
    { color_id: 'black', size_option_id: 'm', price: 899, compare_at_price: 1299, stock: 10 },
    { color_id: 'black', size_option_id: 'l', price: 899, compare_at_price: null, stock: 0 },
  ],
};

describe('parseProductInput', () => {
  it('cleans a valid product', () => {
    const p = parseProductInput(valid);
    expect(p.name).toBe('Shadow Oversized Tee');
    expect(p.pattern).toBeNull();
    expect(p.variants).toHaveLength(2);
    expect(p.variants[1]).toMatchObject({ compare_at_price: null, stock: 0 });
    expect(p.size_chart_id).toBeNull(); // not chosen → store default chart
  });

  it('colour is optional: sizes alone are fine (e.g. printed tees)', () => {
    const p = parseProductInput({ ...valid, variants: [
      { color_id: '', size_option_id: 'm', price: 899, compare_at_price: null, stock: 3 },
      { size_option_id: 'l', price: 899, compare_at_price: null, stock: 1 },
    ] });
    expect(p.variants.map((v) => v.color_id)).toEqual([null, null]);
    expect(() => parseProductInput({ ...valid, variants: [
      { size_option_id: 'm', price: 899, stock: 1 }, { color_id: null, size_option_id: 'm', price: 899, stock: 1 },
    ] })).toThrow('Each colour + size combination can only be added once.');
    expect(() => parseProductInput({ ...valid, variants: [{ color_id: 'black', price: 899, stock: 1 }] }))
      .toThrow('Every variant needs a size.');
  });

  it('keeps a chosen size chart', () => {
    expect(parseProductInput({ ...valid, size_chart_id: 'chart-1' }).size_chart_id).toBe('chart-1');
    expect(parseProductInput({ ...valid, size_chart_id: '' }).size_chart_id).toBeNull();
  });

  it.each([
    [{ name: '' }, 'Product name is required.'],
    [{ status: 'live' }, 'Status must be active or draft.'],
    [{ variants: [] }, 'Add at least one size/colour with a price.'],
    [{ variants: [{ ...valid.variants[0], price: 0 }] }, 'Every size needs a selling price above ₹0.'],
    [{ variants: [{ ...valid.variants[0], stock: -1 }] }, 'Stock cannot be negative.'],
    [{ variants: [{ ...valid.variants[0], compare_at_price: 500 }] }, 'MRP must be higher than the selling price.'],
    [{ variants: [valid.variants[0], valid.variants[0]] }, 'Each colour + size combination can only be added once.'],
    [{ images: ['javascript:alert(1)'] }, 'Images must be https links.'],
  ])('rejects %o', (override, message) => {
    expect(() => parseProductInput({ ...valid, ...override })).toThrow(new ProductInputError(message));
  });

  it('does not invent sizes, stock, fabric or images', () => {
    const p = parseProductInput({ ...valid, fabric: '', images: [] });
    expect(p.fabric).toBeNull();
    expect(p.images).toEqual([]);
  });
});
