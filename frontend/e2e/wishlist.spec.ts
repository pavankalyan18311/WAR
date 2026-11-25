import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/** Signed-in wishlist: heart → saved to the account → listed → removed. Uses a temporary customer. */
const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) as any;
const user = { id: '', email: `zz-wish-${Date.now()}@example.com`, password: `Zz!Wish${Date.now()}` };

test.describe.configure({ timeout: 120_000 });

test.beforeAll(async () => {
  const { data, error } = await db.auth.admin.createUser({ email: user.email, password: user.password, email_confirm: true });
  if (error) throw error;
  user.id = data.user.id;
  await db.from('profiles').upsert({ id: user.id, email: user.email, name: 'ZZ Wish', role: 'customer' });
});
test.afterAll(async () => {
  if (!user.id) return;
  await db.from('wishlist').delete().eq('user_id', user.id);
  await db.auth.admin.deleteUser(user.id);
});

const savedIds = async () => ((await db.from('wishlist').select('product_id').eq('user_id', user.id)).data ?? []).map((r: any) => r.product_id);

test('signed-in wishlist is saved to the account', async ({ page }) => {
  const problems: string[] = [];
  // "Failed to fetch" = a request cancelled because the test navigated away (e.g. after the login redirect).
  page.on('console', (m) => {
    const text = m.text().split('\n')[0];
    if (m.type() === 'error' && !/favicon|DevTools|Failed to fetch/i.test(text)) problems.push(text);
  });
  page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/api/wishlist')) problems.push(`HTTP ${r.status()} ${r.url()}`); });

  await page.goto('/auth/login', { waitUntil: 'networkidle' });
  await expect(async () => {
    await page.getByTestId('auth-email').fill(user.email);
    await page.getByTestId('auth-password').fill(user.password);
    await expect(page.getByTestId('auth-email')).toHaveValue(user.email, { timeout: 1000 });
  }).toPass({ timeout: 20_000 });
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/auth'), { timeout: 30_000 });

  await page.goto('/products', { waitUntil: 'networkidle' });
  const card = page.getByTestId('product-card').first();
  const name = (await card.locator('a').first().textContent())!.trim();
  await card.getByRole('button', { name: 'Add to wishlist' }).click();
  await expect(card.getByRole('button', { name: 'Remove from wishlist' })).toBeVisible();
  await expect.poll(savedIds).toHaveLength(1);

  await page.goto('/wishlist', { waitUntil: 'networkidle' });
  await expect(page.getByText(name).first()).toBeVisible();

  await page.goto('/products', { waitUntil: 'networkidle' });
  await page.getByTestId('product-card').first().getByRole('button', { name: 'Remove from wishlist' }).click();
  await expect.poll(savedIds).toHaveLength(0);

  // Product page: the heart turns red straight away (no reload needed), and back again.
  await page.getByTestId('product-card').first().click();
  await expect(page.getByTestId('product-title')).toBeVisible();
  const main = page.locator('main');
  await main.getByRole('button', { name: 'Add to wishlist' }).first().click();
  await expect(main.getByRole('button', { name: 'Remove from wishlist' }).first()).toBeVisible({ timeout: 2000 });
  await expect.poll(savedIds).toHaveLength(1);
  await main.getByRole('button', { name: 'Remove from wishlist' }).first().click();
  await expect.poll(savedIds).toHaveLength(0);

  expect(problems, problems.join('\n')).toEqual([]);
});
