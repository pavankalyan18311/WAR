import { beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { saveProduct, type ProductInput } from '@/lib/admin/products';

const notifyRestocked = vi.fn(async (..._a: any[]) => 0);
vi.mock('@/lib/stockAlerts', () => ({ notifyRestocked: (...a: any[]) => notifyRestocked(...a) }));

type Row = Record<string, any>;
let db: Record<string, Row[]>;

/** Tiny in-memory stand-in for the Supabase query builder (only what saveProduct uses). */
function fakeSupabase() {
  return {
    from(table: string) {
      db[table] ??= [];
      const filters: [string, any][] = [];
      let op: 'select' | 'update' | 'delete' = 'select';
      let patch: Row = {};
      const match = () => db[table].filter((r) => filters.every(([k, v]) => r[k] === v));
      const b: any = {
        select: () => b,
        eq: (k: string, v: any) => { filters.push([k, v]); return b; },
        insert: (rows: Row | Row[]) => {
          const list = (Array.isArray(rows) ? rows : [rows]).map((r) => ({ id: r.id ?? `${table}-${db[table].length + 1}`, ...r }));
          db[table].push(...list);
          const ib: any = { select: () => ib, single: async () => ({ data: list[0], error: null }), then: (res: any) => res({ data: list, error: null }) };
          return ib;
        },
        upsert: (rows: Row[], { onConflict }: { onConflict: string }) => {
          const keys = onConflict.split(',');
          for (const r of rows) {
            const existing = db[table].find((x) => keys.every((k) => x[k] === r[k]));
            if (existing) Object.assign(existing, r); else db[table].push({ id: `${table}-${db[table].length + 1}`, ...r });
          }
          return Promise.resolve({ error: null });
        },
        update: (p: Row) => { op = 'update'; patch = p; return b; },
        delete: () => { op = 'delete'; return b; },
        single: async () => ({ data: match()[0] ?? null, error: null }),
        then: (res: any) => {
          if (op === 'update') match().forEach((r) => Object.assign(r, patch));
          if (op === 'delete') db[table] = db[table].filter((r) => !match().includes(r));
          return res({ data: match(), error: null });
        },
      };
      return b;
    },
  };
}

const input = (over: Partial<ProductInput> = {}): ProductInput => ({
  name: 'Shadow Tee', description: null, fabric: '100% Cotton', fit: 'Oversized', pattern: null,
  sleeve_type: null, neck_type: null, gender: null, status: 'active',
  category_ids: ['cat1'], collection_ids: ['col1'],
  images: ['https://x.supabase.co/a.jpg', 'https://x.supabase.co/b.jpg'],
  variants: [
    { color_id: 'black', size_option_id: 'm', price: 899, compare_at_price: 1299, stock: 10 },
    { color_id: 'black', size_option_id: 'l', price: 899, compare_at_price: 1299, stock: 4 },
  ],
  ...over,
});

describe('saveProduct', () => {
  beforeEach(() => { db = {}; });

  it('creates the product with its categories, collections, images, variants and stock', async () => {
    const id = await saveProduct(fakeSupabase(), input());

    expect(db.products[0]).toMatchObject({ id, name: 'Shadow Tee', status: 'active', fabric: '100% Cotton' });
    expect(db.products[0].slug).toMatch(/^shadow-tee-[a-z0-9]{4}$/);
    expect(db.product_categories).toEqual([{ id: expect.any(String), product_id: id, category_id: 'cat1' }]);
    expect(db.product_collections).toEqual([{ id: expect.any(String), product_id: id, collection_id: 'col1' }]);
    expect(db.product_media.map((m) => [m.storage_path, m.sort_order])).toEqual([
      ['https://x.supabase.co/a.jpg', 0], ['https://x.supabase.co/b.jpg', 1],
    ]);
    expect(db.product_variants).toHaveLength(2);
    expect(db.product_variants[0]).toMatchObject({ product_id: id, color_id: 'black', size_option_id: 'm', price: 899, compare_at_price: 1299, status: 'active' });
    expect(db.inventory.map((i) => i.quantity)).toEqual([10, 4]);
  });

  it('saves a product without colours, and updates (not duplicates) those sizes on edit', async () => {
    const noColour = [{ color_id: null, size_option_id: 'm', price: 799, compare_at_price: null, stock: 5 }];
    const id = await saveProduct(fakeSupabase(), input({ variants: noColour }));
    expect(db.product_variants).toHaveLength(1);
    expect(db.product_variants[0]).toMatchObject({ color_id: null, size_option_id: 'm' });
    expect(db.product_variants[0].sku).toMatch(/^WAR-/);

    await saveProduct(fakeSupabase(), input({ variants: [{ ...noColour[0], stock: 2 }] }), id);
    expect(db.product_variants).toHaveLength(1);
    expect(db.inventory[0].quantity).toBe(2);
  });

  it('emails back-in-stock requests only for sizes that go from 0 to in stock', async () => {
    const id = await saveProduct(fakeSupabase(), input());
    const [mId, lId] = db.product_variants.map((v) => v.id);
    db.inventory.find((i) => i.variant_id === mId)!.quantity = 0; // M sold out; L still has 4
    notifyRestocked.mockClear();

    await saveProduct(fakeSupabase(), input({ variants: [
      { color_id: 'black', size_option_id: 'm', price: 899, compare_at_price: 1299, stock: 6 },
      { color_id: 'black', size_option_id: 'l', price: 899, compare_at_price: 1299, stock: 9 },
    ] }), id);

    expect(notifyRestocked).toHaveBeenCalledTimes(1);
    expect(notifyRestocked.mock.calls[0][1]).toEqual([mId]);
    expect(lId).toBeTruthy();
  });

  it('a failing restock email never fails the product save', async () => {
    const id = await saveProduct(fakeSupabase(), input());
    db.inventory[0].quantity = 0;
    notifyRestocked.mockRejectedValueOnce(new Error('mail down'));
    await expect(saveProduct(fakeSupabase(), input(), id)).resolves.toBe(id);
  });

  it('saves the chosen size chart', async () => {
    const id = await saveProduct(fakeSupabase(), input({ size_chart_id: 'chart-1' }));
    expect(db.products[0].size_chart_id).toBe('chart-1');
    await saveProduct(fakeSupabase(), input({ size_chart_id: null }), id);
    expect(db.products[0].size_chart_id).toBeNull();
  });

  it('on edit, updates matching variants instead of duplicating, and deactivates removed ones', async () => {
    const id = await saveProduct(fakeSupabase(), input());
    const [mId] = db.product_variants.map((v) => v.id);

    await saveProduct(fakeSupabase(), input({
      category_ids: ['cat2'],
      variants: [{ color_id: 'black', size_option_id: 'm', price: 799, compare_at_price: null, stock: 3 }],
    }), id);

    expect(db.products).toHaveLength(1);
    expect(db.product_categories.map((c) => c.category_id)).toEqual(['cat2']);
    expect(db.product_variants).toHaveLength(2);
    expect(db.product_variants.find((v) => v.id === mId)).toMatchObject({ price: 799, compare_at_price: null, status: 'active' });
    expect(db.product_variants.find((v) => v.size_option_id === 'l')?.status).toBe('inactive');
    expect(db.inventory.find((i) => i.variant_id === mId)?.quantity).toBe(3);
  });

  it('stock typed by the admin becomes the sellable stock, clearing stale reservations (no 500 when lowering it)', async () => {
    const id = await saveProduct(fakeSupabase(), input());
    const inv = db.inventory[0];
    Object.assign(inv, { quantity: 8, reserved_quantity: 8 }); // left over from the old checkout

    await saveProduct(fakeSupabase(), input({
      variants: [{ color_id: 'black', size_option_id: 'm', price: 899, compare_at_price: 1299, stock: 7 }],
    }), id);

    expect(inv).toMatchObject({ quantity: 7, reserved_quantity: 0 });
  });

  it('adds new fabric/fit/... values to the dropdown options (tidied, no duplicates)', async () => {
    await saveProduct(fakeSupabase(), input({ fabric: 'bamboo  cotton', fit: 'Oversized', gender: null }));
    const values = (db.product_attribute_options ?? []).map((o) => `${o.attribute}:${o.value}`);
    expect(values).toEqual(expect.arrayContaining(['fabric:Bamboo Cotton', 'fit:Oversized']));
    expect(values.filter((v) => v.startsWith('gender'))).toEqual([]);
  });

  it('re-activates a variant that is added back', async () => {
    const id = await saveProduct(fakeSupabase(), input());
    await saveProduct(fakeSupabase(), input({ variants: [input().variants[0]] }), id);
    await saveProduct(fakeSupabase(), input(), id);
    expect(db.product_variants.every((v) => v.status === 'active')).toBe(true);
  });
});
