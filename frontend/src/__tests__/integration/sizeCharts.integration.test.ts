// @vitest-environment node
/**
 * Live check of size charts against the real Supabase (2026_10_10 migration).
 * Creates a temporary chart + product and deletes them at the end.
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
vi.setConfig({ testTimeout: 60_000 });
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) as any;
const NAME = `ZZ Test Chart ${Date.now()}`;
const req = (method: string, body?: unknown) => new Request('http://x', { method, body: body ? JSON.stringify(body) : undefined });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

let chartId = '';
let productId = '';
let defaultId = '';

describe.skipIf(!enabled)('Size charts (live)', () => {
  beforeAll(async () => {
    defaultId = (await db.from('size_charts').select('id').eq('is_default', true).single()).data.id;
  });

  afterAll(async () => {
    if (productId) {
      const { data: v } = await db.from('product_variants').select('id').eq('product_id', productId);
      for (const x of v ?? []) await db.from('inventory').delete().eq('variant_id', x.id);
      await db.from('product_variants').delete().eq('product_id', productId);
      await db.from('products').delete().eq('id', productId);
    }
    await db.from('size_charts').delete().eq('name', NAME);
    // The store default must be untouched by this test.
    expect((await db.from('size_charts').select('is_default').eq('id', defaultId).single()).data.is_default).toBe(true);
  });

  it('1. admin creates a chart (validated, not default)', async () => {
    const { POST } = await import('@/app/api/admin/size-charts/route');
    const bad = await POST(req('POST', { name: NAME, unit: 'cm', columns: ['Chest'], rows: [] }));
    expect(bad.status).toBe(400);
    const res = await POST(req('POST', { name: NAME, unit: 'cm', columns: ['Chest', 'Length'], rows: [{ size: 'M', values: ['112', '74'] }], note: '', is_default: false }));
    const body = await res.json();
    expect(res.status, JSON.stringify(body)).toBe(200);
    chartId = body.chart.id;
  });

  it('2. a product can use it; the shop picks the right chart', async () => {
    const { data: color } = await db.from('colors').select('id').limit(1).single();
    const { data: size } = await db.from('size_options').select('id').limit(1).single();
    const { saveProduct } = await import('@/lib/admin/products');
    productId = await saveProduct(db, {
      name: 'ZZ Size Chart Tee', description: null, fabric: null, fit: null, pattern: null, sleeve_type: null, neck_type: null,
      gender: null, status: 'draft', category_ids: [], collection_ids: [], images: [], size_chart_id: chartId,
      variants: [{ color_id: color.id, size_option_id: size.id, price: 799, compare_at_price: null, stock: 1 }],
    });
    expect((await db.from('products').select('size_chart_id').eq('id', productId).single()).data.size_chart_id).toBe(chartId);

    const { GET } = await import('@/app/api/size-charts/route');
    const { charts } = await (await GET()).json();
    const { chartForProduct } = await import('@/lib/sizeCharts');
    expect(chartForProduct(charts, chartId)?.name).toBe(NAME);
    expect(chartForProduct(charts, null)?.id).toBe(defaultId);
  });

  it('3. admin list counts the product; editing works', async () => {
    const list = await import('@/app/api/admin/size-charts/route');
    const { charts } = await (await list.GET()).json();
    expect(charts.find((c: any) => c.id === chartId).product_count).toBe(1);

    const one = await import('@/app/api/admin/size-charts/[id]/route');
    const res = await one.PUT(req('PUT', { name: NAME, unit: 'cm', columns: ['Chest'], rows: [{ size: 'M', values: ['110'] }], note: 'Flat', is_default: false }), ctx(chartId));
    expect(res.status).toBe(200);
    const { data } = await db.from('size_charts').select('columns, rows, note').eq('id', chartId).single();
    expect(data).toMatchObject({ columns: ['Chest'], rows: [{ size: 'M', values: ['110'] }], note: 'Flat' });
  });

  it('3b. Settings can switch the store default (and switch it back)', async () => {
    const { POST } = await import('@/app/api/admin/size-charts/default/route');
    try {
      expect((await POST(req('POST', { id: chartId }))).status).toBe(200);
      const { data } = await db.from('size_charts').select('id').eq('is_default', true);
      expect(data.map((c: any) => c.id)).toEqual([chartId]);
    } finally {
      expect((await POST(req('POST', { id: defaultId }))).status).toBe(200);
    }
  });

  it('3c. a product without colours saves and reads back with no colour options', async () => {
    const { data: size } = await db.from('size_options').select('id').limit(1).single();
    const { saveProduct } = await import('@/lib/admin/products');
    await saveProduct(db, {
      name: 'ZZ Size Chart Tee', description: null, fabric: null, fit: null, pattern: null, sleeve_type: null, neck_type: null,
      gender: null, status: 'draft', category_ids: [], collection_ids: [], images: [], size_chart_id: chartId,
      variants: [{ color_id: null, size_option_id: size.id, price: 799, compare_at_price: null, stock: 2 }],
    }, productId);
    const { data: row } = await db.from('products')
      .select('*, product_variants(*, color:colors(*), size_option:size_options(*), inventory(*))').eq('id', productId).single();
    const { normalizeProduct } = await import('@/lib/supabase/queries');
    const p = normalizeProduct({ ...row, product_variants: row.product_variants.filter((v: any) => v.status === 'active') });
    expect(p.colors).toEqual([]);
    expect(p.variants).toHaveLength(1);
    expect(p.variants[0]).toMatchObject({ color: '', stock_quantity: 2 });
  });

  it('4. deleting the chart puts its products back on the default', async () => {
    const one = await import('@/app/api/admin/size-charts/[id]/route');
    expect((await one.DELETE(req('DELETE'), ctx(chartId))).status).toBe(200);
    expect((await db.from('products').select('size_chart_id').eq('id', productId).single()).data.size_chart_id).toBeNull();
  });
});
