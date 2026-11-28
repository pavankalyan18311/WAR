// @vitest-environment node
/**
 * Live check of row-level security (2026_11_29 migration): with only the public (anon) key —
 * the one shipped to every browser — nobody can read other people's profiles or carts,
 * and a customer cannot promote themselves to admin.
 * Two temporary customers are created and deleted at the end.
 * Run with:  RUN_INTEGRATION=1 npx vitest run src/__tests__/integration/rlsLockdown
 */
import fs from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
);

const enabled = process.env.RUN_INTEGRATION === '1';
vi.setConfig({ testTimeout: 60_000 });
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, opts) as any;
const anon = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts) as any;

const stamp = Date.now();
const a = { id: '', email: `zz-rls-a-${stamp}@example.com`, password: `Zz!a${stamp}`, cartId: '' };
const b = { id: '', email: `zz-rls-b-${stamp}@example.com`, password: `Zz!b${stamp}`, cartId: '' };
let asA: any;

describe.skipIf(!enabled)('Row-level security lockdown (live)', () => {
  beforeAll(async () => {
    for (const u of [a, b]) {
      const { data, error } = await db.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true });
      if (error) throw error;
      u.id = data.user.id;
      await db.from('profiles').upsert({ id: u.id, email: u.email, name: 'ZZ RLS', role: 'customer' });
      const { data: cart } = await db.from('carts').insert({ user_id: u.id, status: 'active' }).select('id').single();
      u.cartId = cart.id;
    }
    asA = anon();
    const { error } = await asA.auth.signInWithPassword({ email: a.email, password: a.password });
    if (error) throw error;
  });

  afterAll(async () => {
    for (const u of [a, b]) {
      if (u.cartId) await db.from('carts').delete().eq('id', u.cartId);
      if (u.id) {
        await db.from('profiles').delete().eq('id', u.id);
        await db.auth.admin.deleteUser(u.id);
      }
    }
  });

  it('a visitor who is not signed in sees no profiles, carts or cart items', async () => {
    const visitor = anon();
    for (const table of ['profiles', 'carts', 'cart_items']) {
      const { data } = await visitor.from(table).select('*').limit(5);
      expect(data ?? [], table).toHaveLength(0);
    }
  });

  it('a signed-in customer sees only their own profile and cart', async () => {
    const { data: profiles } = await asA.from('profiles').select('id');
    expect((profiles ?? []).map((p: any) => p.id)).toEqual([a.id]);
    const { data: carts } = await asA.from('carts').select('id');
    expect((carts ?? []).map((c: any) => c.id)).toEqual([a.cartId]);
  });

  it('a customer cannot make themselves an admin', async () => {
    await asA.from('profiles').update({ role: 'admin' }).eq('id', a.id);
    const { data } = await db.from('profiles').select('role').eq('id', a.id).single();
    expect(data.role).toBe('customer');
  });

  it("a customer cannot change another customer's profile", async () => {
    await asA.from('profiles').update({ name: 'hacked' }).eq('id', b.id);
    const { data } = await db.from('profiles').select('name').eq('id', b.id).single();
    expect(data.name).toBe('ZZ RLS');
  });

  it('a customer can still edit their own name and phone, and use their cart', async () => {
    const { error } = await asA.from('profiles').update({ name: 'ZZ Renamed', phone: '9876500000' }).eq('id', a.id);
    expect(error).toBeNull();
    const { data } = await db.from('profiles').select('name').eq('id', a.id).single();
    expect(data.name).toBe('ZZ Renamed');
    const { data: variant } = await db.from('product_variants').select('id').limit(1).single();
    const { error: cartErr } = await asA.from('cart_items').insert({ cart_id: a.cartId, variant_id: variant.id, quantity: 1 });
    expect(cartErr).toBeNull();
    const { error: otherErr } = await asA.from('cart_items').insert({ cart_id: b.cartId, variant_id: variant.id, quantity: 1 });
    expect(otherErr).not.toBeNull();
    await db.from('cart_items').delete().in('cart_id', [a.cartId, b.cartId]);
  });
});
