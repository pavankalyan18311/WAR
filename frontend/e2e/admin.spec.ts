import fs from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Walks through every admin page in a real browser as a temporary admin.
 * Everything created (user, coupon, collection, product) is deleted afterwards.
 */
const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) as any;
const admin = { id: '', email: `zz-admin-${Date.now()}@example.com`, password: `Zz!Admin${Date.now()}` };
const stamp = String(Date.now()).slice(-6);

test.describe.configure({ timeout: 120_000 });

function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`JS error: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|DevTools|Fast Refresh/i.test(m.text())) problems.push(`console: ${m.text().slice(0, 200)}`);
  });
  page.on('response', (r) => { if (r.status() >= 400 && r.status() !== 401) problems.push(`HTTP ${r.status()} ${r.url().slice(0, 160)}`); });
  return problems;
}

test.beforeAll(async () => {
  const { data, error } = await db.auth.admin.createUser({ email: admin.email, password: admin.password, email_confirm: true });
  if (error) throw error;
  admin.id = data.user.id;
  await db.from('profiles').upsert({ id: admin.id, email: admin.email, name: 'ZZ Admin', role: 'admin' });
});

test.afterAll(async () => {
  const { data: products } = await db.from('products').select('id').ilike('name', 'ZZ E2E%');
  for (const p of products ?? []) {
    const { data: variants } = await db.from('product_variants').select('id').eq('product_id', p.id);
    const ids = (variants ?? []).map((v: any) => v.id);
    if (ids.length) await db.from('inventory').delete().in('variant_id', ids);
    await db.from('product_variants').delete().eq('product_id', p.id);
    for (const t of ['product_media', 'product_categories', 'product_collections']) await db.from(t).delete().eq('product_id', p.id);
    await db.from('products').delete().eq('id', p.id);
  }
  await db.from('coupons').delete().like('code', `ZZE2E${stamp}%`);
  await db.from('collections').delete().ilike('name', 'ZZ E2E%');
  if (admin.id) await db.auth.admin.deleteUser(admin.id);
});

async function login(page: Page) {
  await page.goto('/auth/login', { waitUntil: 'networkidle' });
  // Fill after hydration and confirm React kept the values.
  await expect(async () => {
    await page.getByTestId('auth-email').fill(admin.email);
    await page.getByTestId('auth-password').fill(admin.password);
    await expect(page.getByTestId('auth-email')).toHaveValue(admin.email, { timeout: 1000 });
  }).toPass({ timeout: 20_000 });
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 30_000 });
  await page.waitForLoadState('networkidle');
}

test('every admin page opens without errors', async ({ page }) => {
  await login(page);
  for (const path of ['/admin/dashboard', '/admin/products', '/admin/products/new', '/admin/collections', '/admin/size-charts', '/admin/homepage', '/admin/coupons',
    '/admin/orders', '/admin/customers', '/admin/reviews', '/admin/stock-alerts', '/admin/messages', '/admin/analytics', '/admin/settings']) {
    const problems = watch(page);
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page, `${path} should not redirect`).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('alert').filter({ hasText: /could not|failed|error/i }), `${path} shows an error`).toHaveCount(0);
    expect(problems, `${path}:\n${problems.join('\n')}`).toEqual([]);
    page.removeAllListeners('console'); page.removeAllListeners('pageerror'); page.removeAllListeners('response');
  }
});

test('create a coupon from the admin UI', async ({ page }) => {
  const problems = watch(page);
  await login(page);
  await page.goto('/admin/coupons', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /new coupon/i }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Coupon code').fill(`ZZE2E${stamp}`);
  await dialog.getByRole('button', { name: /% off/ }).click();
  await dialog.getByLabel('Discount (%)').fill('10');
  await dialog.getByRole('button', { name: 'Next 7 days' }).click();
  await expect(dialog).toContainText(`ZZE2E${stamp}: 10% off · anyone`);
  await dialog.getByRole('button', { name: 'Create Coupon' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('table')).toContainText(`ZZE2E${stamp}`);
  expect(problems, problems.join('\n')).toEqual([]);
});

test('create a collection from the admin UI', async ({ page }) => {
  const problems = watch(page);
  await login(page);
  await page.goto('/admin/collections', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /new collection|add collection|create collection/i }).first().click();
  await page.getByPlaceholder('e.g. Summer Edit').fill(`ZZ E2E Collection ${stamp}`);
  await page.getByRole('button', { name: /^create$/i }).click();
  await expect(page.getByText(`ZZ E2E Collection ${stamp}`)).toBeVisible();
  expect(problems, problems.join('\n')).toEqual([]);
});

test('add a product with a dropdown value, an "Other" value, sizes, stock and an image', async ({ page }) => {
  const problems = watch(page);
  await login(page);
  await page.goto('/admin/products/new', { waitUntil: 'networkidle' });
  await page.getByLabel('Product Name').fill(`ZZ E2E Tee ${stamp}`);

  const fabric = page.getByRole('combobox', { name: 'Fabric' });
  await expect(fabric.locator('option')).not.toHaveCount(2); // more than "Not set" + "Other…" once options are loaded
  await fabric.selectOption({ index: 1 });
  await page.getByRole('combobox', { name: 'Fit' }).selectOption('__other__');
  await page.getByLabel('Fit (type your own)').fill(`zz e2e fit ${stamp}`);

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.locator('input[type="file"]').setInputFiles({ name: 'tee.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('Main')).toBeVisible({ timeout: 20_000 });

  const colourButtons = page.locator('section', { hasText: 'Colours, Sizes' }).locator('button');
  await colourButtons.first().click();                       // first colour
  await page.locator('section', { hasText: 'Colours, Sizes' }).getByText('Sizes', { exact: true }).locator('..').locator('button').first().click(); // first size
  const price = page.getByLabel(/^Selling price for /).first();
  await price.fill('799');
  await page.getByLabel(/^Stock for /).first().fill('7');

  await page.getByRole('button', { name: 'Save as Draft' }).click();
  await page.waitForURL(/\/admin\/products$/, { timeout: 30_000 });
  await expect(page.getByText(`ZZ E2E Tee ${stamp}`)).toBeVisible();

  const { data } = await db.from('products').select('id, fit, product_media(storage_path), product_variants(price, inventory(quantity))').eq('name', `ZZ E2E Tee ${stamp}`).single();
  expect(data.fit).toBe(`Zz E2e Fit ${stamp}`);
  expect(data.product_media).toHaveLength(1);
  expect(Number(data.product_variants[0].price)).toBe(799);
  const { data: remembered } = await db.from('product_attribute_options').select('id').eq('attribute', 'fit').eq('value', `Zz E2e Fit ${stamp}`);
  expect(remembered).toHaveLength(1);
  await db.from('product_attribute_options').delete().eq('value', `Zz E2e Fit ${stamp}`);
  // remove uploaded image
  const path = data.product_media[0].storage_path.split('/storage/v1/object/public/products/')[1];
  if (path) await db.storage.from('products').remove([path]);
  expect(problems, problems.join('\n')).toEqual([]);
});

test('save shipping settings from the admin UI (value unchanged)', async ({ page }) => {
  const problems = watch(page);
  await login(page);
  await page.goto('/admin/settings', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Save Shipping Settings' }).click();
  await expect(page.getByText('Shipping settings saved')).toBeVisible();
  expect(problems, problems.join('\n')).toEqual([]);
});
