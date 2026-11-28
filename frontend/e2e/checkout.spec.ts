/* eslint-disable @typescript-eslint/no-explicit-any -- loosely typed test doubles / admin client */
import fs from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Cart → checkout as a real customer. Adding to cart needs an account, so a visitor is sent to sign in;
 * a signed-in customer's cart is saved to their account and carries through to checkout.
 * Uses a temporary customer (deleted at the end). Stops before placing the order — no order or email is created.
 */
const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) as any;
const user = { id: '', email: `zz-cart-${Date.now()}@example.com`, password: `Zz!Cart${Date.now()}` };

test.describe.configure({ mode: 'serial', timeout: 120_000 });

test.beforeAll(async () => {
  const { data, error } = await db.auth.admin.createUser({ email: user.email, password: user.password, email_confirm: true });
  if (error) throw error;
  user.id = data.user.id;
  await db.from('profiles').upsert({ id: user.id, email: user.email, name: 'ZZ Cart', role: 'customer' });
});
test.afterAll(async () => {
  if (!user.id) return;
  const { data: carts } = await db.from('carts').select('id').eq('user_id', user.id);
  const ids = (carts ?? []).map((c: any) => c.id);
  if (ids.length) {
    await db.from('cart_items').delete().in('cart_id', ids);
    await db.from('carts').delete().in('id', ids);
  }
  await db.from('profiles').delete().eq('id', user.id);
  await db.auth.admin.deleteUser(user.id);
});

const noPopup = (page: Page) => page.addInitScript(() => sessionStorage.setItem('threadx-auth-popup-shown', '1'));

async function signIn(page: Page) {
  await noPopup(page);
  await page.goto('/auth/login', { waitUntil: 'networkidle' });
  await expect(async () => {
    await page.getByTestId('auth-email').fill(user.email);
    await page.getByTestId('auth-password').fill(user.password);
    await expect(page.getByTestId('auth-email')).toHaveValue(user.email, { timeout: 1000 });
  }).toPass({ timeout: 20_000 });
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });
}

async function openFirstProductAndPickSize(page: Page) {
  await page.goto('/products', { waitUntil: 'networkidle' });
  await page.getByTestId('product-card').first().locator('a').first().click();
  await page.waitForURL(/\/products\/[a-z0-9-]+/);
  await expect(page.getByTestId('product-title')).toBeVisible();
  const sizes = page.locator('[data-testid^="size-button-"]:enabled');
  await expect(sizes.first()).toBeVisible();
  await sizes.first().click();
}

test('checkout with an empty cart says so, instead of showing an empty order form', async ({ page }) => {
  await signIn(page);
  await page.goto('/checkout', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: /your cart is empty/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /shop the drop|browse/i }).first()).toBeVisible();
  await expect(page.getByPlaceholder('First Name *')).toHaveCount(0);
});

test('a visitor who adds to cart is asked to sign in first', async ({ page }) => {
  await noPopup(page);
  await openFirstProductAndPickSize(page);
  await page.getByTestId('pdp-add-to-cart').click();
  await page.waitForURL(/\/auth\/login/);
});

test('a signed-in customer adds to cart, sees it in the cart and at checkout', async ({ page }) => {
  await signIn(page);

  await openFirstProductAndPickSize(page);
  const name = (await page.getByTestId('product-title').textContent())!.trim();
  await page.getByTestId('pdp-add-to-cart').click();

  // The drawer opens with the item, and the cart is saved to the account (browser → database, own cart only).
  await expect(page.getByTestId('cart-drawer')).toBeVisible();
  await expect(page.getByTestId('cart-badge')).toHaveText(/[1-9]/);
  await expect.poll(async () => {
    const { data: carts } = await db.from('carts').select('id').eq('user_id', user.id);
    const ids = (carts ?? []).map((c: any) => c.id);
    if (!ids.length) return 0;
    return ((await db.from('cart_items').select('id').in('cart_id', ids)).data ?? []).length;
  }, { timeout: 15_000 }).toBe(1);

  await page.goto('/cart', { waitUntil: 'networkidle' });
  await expect(page.getByTestId('cart-item').first()).toContainText(name);

  await page.goto('/checkout', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1, name: 'Checkout' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Delivery Address' })).toBeVisible();
  await expect(page.getByText(name).first()).toBeVisible();
});
