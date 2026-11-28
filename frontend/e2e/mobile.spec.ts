import { test, expect, devices } from '@playwright/test';

/** Every public page must fit a phone screen: no sideways scrolling of the whole page. */
const PAGES = ['/', '/shop', '/products', '/products/asura', '/collections', '/cart', '/checkout', '/wishlist',
  '/account/orders', '/account/profile', '/track-order', '/contact', '/faq', '/size-guide', '/shipping-policy',
  '/refund-policy', '/privacy-policy', '/terms-of-service', '/cookie-policy', '/auth/login', '/auth/register',
  '/auth/forgot-password'];

test.use({ ...devices['iPhone 13'], defaultBrowserType: 'chromium' });
test.describe.configure({ timeout: 90_000 });

for (const path of PAGES) {
  test(`${path} fits a phone screen`, async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('threadx-auth-popup-shown', '1'));
    await page.goto(path, { waitUntil: 'networkidle' });
    const { scrollWidth, width } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      width: document.documentElement.clientWidth,
    }));
    expect(scrollWidth, `page is ${scrollWidth}px wide on a ${width}px screen`).toBeLessThanOrEqual(width + 1);
  });
}
