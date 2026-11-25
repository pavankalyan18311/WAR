import { test } from '@playwright/test';

/**
 * Design review helper (not a pass/fail test): saves full-page screenshots of key storefront pages.
 * Run:  $env:SHOTS_DIR='<folder>'; npx playwright test e2e/screenshots.spec.ts --project=chromium
 */
const dir = process.env.SHOTS_DIR;

test.skip(!dir, 'Set SHOTS_DIR to take design screenshots');

const pages: [string, string][] = [
  ['home', '/'],
  ['products', '/products'],
  ['collections', '/collections'],
  ['cart', '/cart'],
  ['login', '/auth/login'],
  ['contact', '/contact'],
];

for (const [name, path] of pages) {
  test(`screenshot ${name}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${dir}/${name}-mobile.png`, fullPage: false });
  });
}

test('screenshot product page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/products', { waitUntil: 'networkidle' });
  const first = page.locator('a[href^="/products/"]').first();
  if (!(await first.count())) return;
  await first.click();
  await page.waitForURL(/\/products\/.+/);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${dir}/product.png`, fullPage: true });
});
