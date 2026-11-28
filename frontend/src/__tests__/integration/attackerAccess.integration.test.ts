// @vitest-environment node
/**
 * Live "attacker" check of the real Supabase: using only the public (anon) key that every browser gets,
 * an outsider and a signed-in customer try to read another customer's private data and to change
 * prices, stock, coupons, orders, points, settings and stored files directly — all must fail.
 * Temporary customers, product, order and rows are deleted at the end.
 * Run with:  RUN_INTEGRATION=1 npx vitest run src/__tests__/integration/attackerAccess
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

const stamp = Date.now();
const mk = (tag: string) => ({ id: '', email: `zz-atk-${tag}-${stamp}@example.com`, password: `Zz!${tag}${stamp}` });
const attacker = mk('a');
const victim = mk('v');
let actingAs = victim;
vi.mock('@/lib/apiAuth', () => ({
  requireUser: async () => ({ user: { id: actingAs.id, email: actingAs.email }, response: null }),
  requireAdmin: async () => ({ user: { id: 'integration-admin' }, response: null }),
}));
vi.mock('@/lib/mailer', () => ({ sendEmail: async () => ({ sent: true }) }));

const enabled = process.env.RUN_INTEGRATION === '1';
vi.setConfig({ testTimeout: 60_000 });
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, opts) as any;
const publicClient = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts) as any;
const address = { full_name: 'ZZ Victim', phone: '9876501234', address_line_1: '1 Secret Street', city: 'Pune', state: 'Maharashtra', pincode: '411001' };

const ids = { product: '', variant: '', order: '', coupon: '', review: '' };
let outsider: any;
let customer: any;

/** Both kinds of attacker, for it.each-style loops. */
const who = () => [['an outsider', outsider], ['another customer', customer]] as const;

describe.skipIf(!enabled)('Attacker access with the public key (live)', () => {
  beforeAll(async () => {
    for (const u of [attacker, victim]) {
      const { data, error } = await db.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true });
      if (error) throw error;
      u.id = data.user.id;
      await db.from('profiles').upsert({ id: u.id, email: u.email, name: 'ZZ Attack Test', role: 'customer' });
    }
    const { data: size } = await db.from('size_options').select('id').limit(1).single();
    const { saveProduct } = await import('@/lib/admin/products');
    ids.product = await saveProduct(db, {
      name: 'ZZ Attack Tee', description: null, fabric: null, fit: null, pattern: null, sleeve_type: null, neck_type: null,
      gender: null, status: 'active', category_ids: [], collection_ids: [], images: [],
      variants: [{ color_id: null, size_option_id: size.id, price: 1000, compare_at_price: null, stock: 10 }],
    });
    ids.variant = (await db.from('product_variants').select('id').eq('product_id', ids.product).single()).data.id;

    // The victim's private data.
    actingAs = victim;
    const { POST } = await import('@/app/api/orders/route');
    const order = await (await POST(new Request('http://x', { method: 'POST', body: JSON.stringify({ items: [{ variant_id: ids.variant, quantity: 1 }], shipping_address: address }) }))).json();
    if (!order.order_id) throw new Error(`could not create victim order: ${JSON.stringify(order)}`);
    ids.order = order.order_id;
    const seed = async (table: string, row: Record<string, unknown>) => {
      const { data, error } = await db.from(table).insert(row).select().single();
      if (error) throw new Error(`seed ${table}: ${error.message}`);
      return data;
    };
    await seed('addresses', { user_id: victim.id, ...address, country: 'India', is_default: true });
    await seed('wishlist', { user_id: victim.id, product_id: ids.product });
    await seed('reward_points', { user_id: victim.id, kind: 'earn', points: 50, remaining: 50, expires_at: new Date(Date.now() + 864e5).toISOString() });
    ids.review = (await seed('product_reviews', { product_id: ids.product, user_id: victim.id, order_id: ids.order, rating: 4, body: 'ZZ private pending review', status: 'pending' })).id;
    await seed('stock_alerts', { variant_id: ids.variant, product_id: ids.product, email: victim.email, user_id: victim.id });
    await seed('contact_messages', { user_id: victim.id, name: 'ZZ Victim', email: victim.email, message: 'ZZ private message' });
    await seed('newsletter_subscribers', { email: victim.email });
    ids.coupon = (await seed('coupons', { code: `ZZSECRET${stamp}`, coupon_type: 'one_time', discount_type: 'percentage', discount_value: 10, min_order_amount: 0, is_active: true })).id;
    await seed('coupon_usages', { coupon_id: ids.coupon, user_id: victim.id, order_id: ids.order });

    outsider = publicClient();
    customer = publicClient();
    const { error } = await customer.auth.signInWithPassword({ email: attacker.email, password: attacker.password });
    if (error) throw error;
  }, 120_000);

  afterAll(async () => {
    const del = (t: string, col: string, v: string) => db.from(t).delete().eq(col, v);
    await del('coupon_usages', 'coupon_id', ids.coupon);
    await del('coupons', 'id', ids.coupon);
    await del('newsletter_subscribers', 'email', victim.email);
    for (const u of [attacker, victim]) {
      await del('contact_messages', 'user_id', u.id);
      await del('reward_points', 'user_id', u.id);
      await del('wishlist', 'user_id', u.id);
      await del('addresses', 'user_id', u.id);
    }
    await del('stock_alerts', 'product_id', ids.product);
    await del('product_reviews', 'product_id', ids.product);
    await del('email_log', 'order_id', ids.order);
    await del('order_items', 'product_id', ids.product);
    await db.from('orders').delete().in('user_id', [attacker.id, victim.id]);
    await del('inventory', 'variant_id', ids.variant);
    await del('product_variants', 'product_id', ids.product);
    await del('products', 'id', ids.product);
    await del('products', 'slug', `hacked-${stamp}`); // in case an attack insert got through
    for (const u of [attacker, victim]) {
      await del('profiles', 'id', u.id);
      if (u.id) await db.auth.admin.deleteUser(u.id);
    }
  }, 120_000);

  const PRIVATE: Array<[string, string, () => string]> = [
    ['orders', 'id', () => ids.order],
    ['order_items', 'order_id', () => ids.order],
    ['addresses', 'user_id', () => victim.id],
    ['wishlist', 'user_id', () => victim.id],
    ['reward_points', 'user_id', () => victim.id],
    ['product_reviews', 'id', () => ids.review],
    ['stock_alerts', 'user_id', () => victim.id],
    ['contact_messages', 'user_id', () => victim.id],
    ['newsletter_subscribers', 'email', () => victim.email],
    ['coupons', 'id', () => ids.coupon],
    ['coupon_usages', 'coupon_id', () => ids.coupon],
    ['email_log', 'order_id', () => ids.order],
  ];

  it("nobody can read another customer's private data", async () => {
    // Sanity: the rows really exist (seen by the server).
    const { count } = await db.from('orders').select('id', { count: 'exact', head: true }).eq('id', ids.order);
    expect(count).toBe(1);
    const leaks: string[] = [];
    for (const [label, client] of who()) {
      for (const [table, col, val] of PRIVATE) {
        const { data } = await client.from(table).select('*').eq(col, val());
        if (data?.length) leaks.push(`${label} read ${table}`);
      }
    }
    expect(leaks).toEqual([]);
  });

  it('nobody can change prices, stock, products or store settings', async () => {
    const before = {
      price: (await db.from('product_variants').select('price').eq('id', ids.variant).single()).data.price,
      stock: (await db.from('inventory').select('quantity').eq('variant_id', ids.variant).single()).data.quantity,
      name: (await db.from('products').select('name').eq('id', ids.product).single()).data.name,
      settings: (await db.from('store_settings').select('shipping_fee, free_shipping_threshold, cod_enabled').eq('id', 1).single()).data,
    };
    for (const [, client] of who()) {
      await client.from('product_variants').update({ price: 1 }).eq('id', ids.variant);
      await client.from('inventory').update({ quantity: 99999, reserved_quantity: 0 }).eq('variant_id', ids.variant);
      await client.from('products').update({ name: 'HACKED' }).eq('id', ids.product);
      await client.from('products').delete().eq('id', ids.product);
      await client.from('store_settings').update({ shipping_fee: 0, free_shipping_threshold: 0, cod_enabled: false }).eq('id', 1);
      await client.from('products').insert({ name: 'HACKED', slug: `hacked-${stamp}`, status: 'active' });
    }
    expect((await db.from('product_variants').select('price').eq('id', ids.variant).single()).data.price).toBe(before.price);
    expect((await db.from('inventory').select('quantity').eq('variant_id', ids.variant).single()).data.quantity).toBe(before.stock);
    expect((await db.from('products').select('name').eq('id', ids.product).single()).data.name).toBe(before.name);
    expect((await db.from('store_settings').select('shipping_fee, free_shipping_threshold, cod_enabled').eq('id', 1).single()).data).toEqual(before.settings);
    const { count } = await db.from('products').select('id', { count: 'exact', head: true }).eq('slug', `hacked-${stamp}`);
    expect(count).toBe(0);
  });

  it('nobody can create coupons, give themselves points, approve reviews or fake orders', async () => {
    for (const [, client] of who()) {
      await client.from('coupons').insert({ code: `ZZFREE${stamp}`, discount_type: 'percentage', discount_value: 100, min_order_amount: 0, is_active: true });
      await client.from('coupons').update({ discount_value: 100 }).eq('id', ids.coupon);
      await client.from('reward_points').insert({ user_id: attacker.id, kind: 'earn', points: 100000, remaining: 100000 });
      await client.from('product_reviews').update({ status: 'approved' }).eq('id', ids.review);
      await client.from('product_reviews').insert({ product_id: ids.product, user_id: attacker.id, rating: 5, body: 'ZZ fake', status: 'approved' });
      await client.from('orders').insert({ user_id: attacker.id, status: 'confirmed', payment_status: 'paid', payment_method: 'cod', subtotal: 0, total: 0, shipping_address: address });
      await client.from('orders').update({ status: 'cancelled', payment_status: 'paid' }).eq('id', ids.order);
      await client.from('order_items').update({ unit_price: 1, total_price: 1 }).eq('order_id', ids.order);
    }
    expect((await db.from('coupons').select('id', { count: 'exact', head: true }).eq('code', `ZZFREE${stamp}`)).count).toBe(0);
    expect((await db.from('coupons').select('discount_value').eq('id', ids.coupon).single()).data.discount_value).toBe(10);
    expect((await db.from('reward_points').select('id', { count: 'exact', head: true }).eq('user_id', attacker.id)).count).toBe(0);
    expect((await db.from('product_reviews').select('status').eq('id', ids.review).single()).data.status).toBe('pending');
    expect((await db.from('product_reviews').select('id', { count: 'exact', head: true }).eq('user_id', attacker.id)).count).toBe(0);
    expect((await db.from('orders').select('id', { count: 'exact', head: true }).eq('user_id', attacker.id)).count).toBe(0);
    const { data: order } = await db.from('orders').select('status, payment_status').eq('id', ids.order).single();
    expect(order).toEqual({ status: 'confirmed', payment_status: 'pending' });
    const { data: items } = await db.from('order_items').select('unit_price').eq('order_id', ids.order);
    expect(Number(items[0].unit_price)).toBe(1000);
  });

  it("nobody can promote themselves to admin or edit someone else's address", async () => {
    await customer.from('profiles').update({ role: 'super_admin' }).eq('id', attacker.id);
    await customer.from('profiles').upsert({ id: attacker.id, email: attacker.email, role: 'admin' });
    await customer.from('addresses').update({ city: 'HACKED' }).eq('user_id', victim.id);
    expect((await db.from('profiles').select('role').eq('id', attacker.id).single()).data.role).toBe('customer');
    expect((await db.from('addresses').select('city').eq('user_id', victim.id).single()).data.city).toBe('Pune');
  });

  it('nobody can upload, overwrite or delete files in the storage buckets', async () => {
    const problems: string[] = [];
    const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
    for (const [label, client] of who()) {
      for (const bucket of ['products', 'media']) {
        const path = `zz-attack-${stamp}.png`;
        const { error } = await client.storage.from(bucket).upload(path, png);
        if (!error) {
          problems.push(`${label} uploaded to ${bucket}`);
          await db.storage.from(bucket).remove([path]);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('nobody can call the server-only points, stock or coupon functions', async () => {
    const stock = async () => (await db.from('inventory').select('quantity, reserved_quantity').eq('variant_id', ids.variant).single()).data;
    const uses = async () => (await db.from('coupons').select('uses_count').eq('id', ids.coupon).single()).data.uses_count;
    const [stockBefore, usesBefore] = [await stock(), await uses()];
    const allowed: string[] = [];
    for (const [label, client] of who()) {
      const calls: Array<[string, Record<string, unknown>]> = [
        ['redeem_reward_points', { p_user: victim.id, p_order: ids.order, p_points: 10 }],
        ['restore_reward_points', { p_order: ids.order }],
        ['reward_balance', { p_user: victim.id }],
        ['decrement_inventory', { p_variant_id: ids.variant, p_qty: 5 }],
        ['increment_inventory', { p_variant_id: ids.variant, p_qty: 5 }],
        ['reserve_inventory', { p_variant_id: ids.variant, p_qty: 5 }],
        ['increment_coupon_uses', { coupon_id: ids.coupon }],
      ];
      for (const [fn, args] of calls) {
        const { error } = await client.rpc(fn, args);
        if (!error) allowed.push(`${label} called ${fn}`);
      }
    }
    expect(allowed).toEqual([]);
    expect(await stock()).toEqual(stockBefore);
    expect(await uses()).toBe(usesBefore);
  });

  it('the shop still works for visitors: catalogue and best sellers are readable', async () => {
    const { data } = await outsider.from('products').select('id').eq('id', ids.product);
    expect(data).toHaveLength(1);
    const { error } = await outsider.rpc('best_selling_product_ids', { p_limit: 5 });
    expect(error).toBeNull();
  });
});
