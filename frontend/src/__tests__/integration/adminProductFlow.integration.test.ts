// @vitest-environment node
/**
 * Real end-to-end check of the admin "add product" flow against the live Supabase project.
 * Only the admin login check is simulated. Everything it creates is deleted at the end.
 * Run with:  RUN_INTEGRATION=1 npx vitest run src/__tests__/integration
 */
import fs from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
);
Object.assign(process.env, env);

vi.mock('@/lib/apiAuth', () => ({ requireAdmin: async () => ({ user: { id: 'integration-admin' }, response: null }) }));

const enabled = process.env.RUN_INTEGRATION === '1';
vi.setConfig({ testTimeout: 60_000 }); // live cloud calls are slower than unit tests
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) as any;
const created = { productId: '', colorId: '', imagePath: '', collectionId: '' };

// 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const json = (method: string, body: unknown) => new Request('http://x', { method, body: JSON.stringify(body) });

describe.skipIf(!enabled)('Admin product flow (live Supabase)', () => {
  let sizes: { id: string; name: string }[] = [];
  let categoryId = '';
  let imageUrl = '';

  beforeAll(async () => {
    const { data: s } = await db.from('size_options').select('id, name').order('sort_order').limit(2);
    sizes = s;
    const { data: c } = await db.from('categories').select('id').limit(1);
    categoryId = c[0].id;
    const { data: col } = await db.from('collections')
      .insert({ name: 'ZZ Integration Collection', slug: `zz-integration-${Date.now()}`, display_order: 999, is_active: false })
      .select('id').single();
    created.collectionId = col.id;
  });

  afterAll(async () => {
    if (created.productId) {
      const { data: variants } = await db.from('product_variants').select('id').eq('product_id', created.productId);
      const ids = (variants ?? []).map((v: any) => v.id);
      if (ids.length) await db.from('inventory').delete().in('variant_id', ids);
      await db.from('product_variants').delete().eq('product_id', created.productId);
      for (const t of ['product_media', 'product_categories', 'product_collections']) {
        await db.from(t).delete().eq('product_id', created.productId);
      }
      await db.from('products').delete().eq('id', created.productId);
    }
    if (created.colorId) await db.from('colors').delete().eq('id', created.colorId);
    if (created.collectionId) await db.from('collections').delete().eq('id', created.collectionId);
    if (created.imagePath) await db.storage.from('products').remove([created.imagePath]);
  });

  it('1. uploads a product image to storage', async () => {
    const { POST } = await import('@/app/api/admin/uploads/route');
    const form = new FormData();
    form.append('file', new File([PNG], 'tee.png', { type: 'image/png' }));
    const res = await POST(new Request('http://x', { method: 'POST', body: form }));
    const body = await res.json();
    expect(res.status, JSON.stringify(body)).toBe(200);
    imageUrl = body.url;
    created.imagePath = imageUrl.split('/storage/v1/object/public/products/')[1];
    expect((await fetch(imageUrl)).status).toBe(200);
  });

  it('2. adds a new colour from the "Add option" box', async () => {
    const { POST } = await import('@/app/api/admin/catalog-options/route');
    const res = await POST(json('POST', { kind: 'color', name: `ZZ Test Colour ${Date.now()}`, hex: '#123456' }));
    const body = await res.json();
    expect(res.status, JSON.stringify(body)).toBe(200);
    created.colorId = body.option.id;
  });

  it('3. creates a draft product with sizes, prices, MRP, stock, category, collection and image', async () => {
    const { POST } = await import('@/app/api/admin/products/route');
    const res = await POST(json('POST', {
      name: 'ZZ Integration Test Tee', description: 'Automated check — safe to ignore', fabric: '100% Cotton', fit: 'Oversized',
      status: 'draft', category_ids: [categoryId], collection_ids: [created.collectionId], images: [imageUrl],
      variants: [
        { color_id: created.colorId, size_option_id: sizes[0].id, price: 899, compare_at_price: 1299, stock: 12 },
        { color_id: created.colorId, size_option_id: sizes[1].id, price: 899, compare_at_price: 1299, stock: 3 },
      ],
    }));
    const body = await res.json();
    expect(res.status, JSON.stringify(body)).toBe(200);
    created.productId = body.id;

    const { data: v } = await db.from('product_variants').select('id, price, compare_at_price, status, inventory(quantity)').eq('product_id', body.id);
    expect(v).toHaveLength(2);
    expect(v.map((x: any) => Number(x.price))).toEqual([899, 899]);
    expect(v.map((x: any) => (Array.isArray(x.inventory) ? x.inventory[0] : x.inventory).quantity).sort()).toEqual([12, 3].sort());
    const { data: media } = await db.from('product_media').select('storage_path').eq('product_id', body.id);
    expect(media[0].storage_path).toBe(imageUrl);
  });

  it('4. loads it back for the edit form exactly as saved', async () => {
    const { GET } = await import('@/app/api/admin/products/[id]/route');
    const body = await (await GET(new Request('http://x'), { params: Promise.resolve({ id: created.productId }) })).json();
    expect(body.product).toMatchObject({
      name: 'ZZ Integration Test Tee', status: 'draft', fabric: '100% Cotton',
      category_ids: [categoryId], collection_ids: [created.collectionId], images: [imageUrl],
    });
    expect(body.product.variants).toHaveLength(2);
  });

  it('5. edits price/stock and removes a size without duplicating variants', async () => {
    const { PUT } = await import('@/app/api/admin/products/[id]/route');
    const res = await PUT(json('PUT', {
      name: 'ZZ Integration Test Tee', status: 'draft', category_ids: [categoryId], collection_ids: [], images: [imageUrl],
      variants: [{ color_id: created.colorId, size_option_id: sizes[0].id, price: 799, compare_at_price: null, stock: 20 }],
    }), { params: Promise.resolve({ id: created.productId }) });
    expect(res.status).toBe(200);

    const { data: v } = await db.from('product_variants')
      .select('size_option_id, price, compare_at_price, status, inventory(quantity)').eq('product_id', created.productId);
    expect(v).toHaveLength(2);
    const kept = v.find((x: any) => x.size_option_id === sizes[0].id);
    const removed = v.find((x: any) => x.size_option_id === sizes[1].id);
    expect(kept).toMatchObject({ status: 'active', compare_at_price: null });
    expect(Number(kept.price)).toBe(799);
    expect((Array.isArray(kept.inventory) ? kept.inventory[0] : kept.inventory).quantity).toBe(20);
    expect(removed.status).toBe('inactive');
  });

  it('6. shop reads it correctly once published, and the admin list shows it', async () => {
    const { PATCH } = await import('@/app/api/admin/products/[id]/route');
    expect((await PATCH(json('PATCH', { status: 'active' }), { params: Promise.resolve({ id: created.productId }) })).status).toBe(200);

    const { normalizeProduct } = await import('@/lib/supabase/queries');
    const { data } = await db.from('products')
      .select('*, product_categories(category:categories(*)), product_media(*), product_variants(*, color:colors(*), size_option:size_options(*), inventory(*)), product_collections(collection_id)')
      .eq('id', created.productId).single();
    const p = normalizeProduct(data);
    expect(p.price).toBe(799);
    expect(p.images[0].url).toBe(imageUrl);
    expect(p.variants.find((x: any) => x.status === 'active').stock_quantity).toBe(20);

    const { GET } = await import('@/app/api/admin/products/route');
    const list = await (await GET()).json();
    expect(list.products.find((x: any) => x.id === created.productId)).toMatchObject({ price: 799, stock: 20, variants: 1 });

    // Hide it again immediately (cleanup also deletes it).
    await PATCH(json('PATCH', { status: 'draft' }), { params: Promise.resolve({ id: created.productId }) });
  });
});
