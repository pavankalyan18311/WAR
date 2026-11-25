import { test, expect, type Page } from '@playwright/test';

/** Collects JS errors, console errors and 5xx responses while a page is open. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`JS error: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|Download the React DevTools|\[Fast Refresh\]/i.test(m.text()) && !/instagram|facebook/i.test(m.location().url)) {
      problems.push(`console: ${m.text().slice(0, 200)}`);
    }
  });
  page.on('response', (r) => {
    if (r.status() >= 500) problems.push(`HTTP ${r.status()} ${r.url()}`);
  });
  return problems;
}

const PUBLIC_PAGES = [
  '/', '/products', '/collections', '/cart', '/wishlist', '/track-order', '/contact', '/faq', '/size-guide',
  '/shipping-policy', '/refund-policy', '/privacy-policy', '/terms-of-service', '/cookie-policy',
  '/auth/login', '/auth/register', '/auth/forgot-password',
];

for (const path of PUBLIC_PAGES) {
  test(`page loads cleanly: ${path}`, async ({ page }) => {
    const problems = watch(page);
    // The homepage can hold Instagram reel players, which keep the network busy — wait for load instead.
    const res = await page.goto(path, { waitUntil: path === '/' ? 'load' : 'networkidle' });
    expect(res?.status(), `status for ${path}`).toBeLessThan(400);
    await expect(page.locator('body')).not.toContainText(/Application error|Unhandled Runtime Error|threadx/i);
    expect(problems, problems.join('\n')).toEqual([]);
  });
}

test('a real product page opens from the shop and shows a price', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/products', { waitUntil: 'networkidle' });
  const firstProduct = page.locator('a[href^="/products/"]').first();
  test.skip(!(await firstProduct.count()), 'No active products in the store yet');
  await firstProduct.click();
  await page.waitForURL(/\/products\/.+/);
  await expect(page.getByTestId('product-title')).toBeVisible();
  await expect(page.locator('text=₹').first()).toBeVisible();
  expect(problems, problems.join('\n')).toEqual([]);
});

test('/support sends people to the contact form', async ({ page }) => {
  await page.goto('/support');
  await expect(page).toHaveURL(/\/contact$/);
});

test('admin pages are protected for visitors', async ({ page }) => {
  await page.goto('/admin/orders');
  await expect(page).not.toHaveURL(/\/admin\/orders$/);
});

test('admin API refuses visitors', async ({ request }) => {
  for (const url of ['/api/admin/orders', '/api/admin/products', '/api/admin/messages', '/api/admin/customers']) {
    const res = await request.get(url);
    expect([401, 403], `${url} returned ${res.status()}`).toContain(res.status());
  }
});

test('customer APIs require sign-in', async ({ request }) => {
  expect((await request.get('/api/orders')).status()).toBe(401);
  expect((await request.get('/api/addresses')).status()).toBe(401);
  expect((await request.post('/api/orders', { data: { items: [] } })).status()).toBe(401);
});

test('contact form shows validation errors from the server', async ({ page }) => {
  await page.goto('/contact', { waitUntil: 'networkidle' });
  await page.getByPlaceholder('Your full name').fill('Tester');
  await page.getByPlaceholder('you@example.com').fill('tester@example.com');
  await page.locator('select').first().selectOption('other');
  await page.getByPlaceholder(/Describe your issue/).fill('short');
  await page.getByRole('button', { name: /send message/i }).click();
  await expect(page.getByRole('alert').filter({ hasText: /between 10 and 5000/ })).toBeVisible();
});
