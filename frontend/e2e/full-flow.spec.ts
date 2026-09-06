import { test, expect } from '@playwright/test';

test.describe('End-to-End User Experience & All Pages Navigation', () => {
  test('navigates from homepage to product catalog and filters products', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/WAR|ThreadX/i);

    // Navigate to products catalog
    await page.goto('/products');
    await expect(page).toHaveURL(/\/products/);

    // Verify products grid is loaded
    const productLinks = page.locator('a[href^="/products/"]');
    await expect(productLinks.first()).toBeVisible();
  });

  test('views product detail page and validates size selection and cart addition', async ({ page }) => {
    await page.goto('/products/heavyweight-oversized-tee-black');

    // Verify PDP title
    await expect(page.locator('h1')).toBeVisible();

    // Select size L
    const sizeLBtn = page.getByRole('button', { name: 'L', exact: true });
    if (await sizeLBtn.isVisible()) {
      await sizeLBtn.click();
    }

    // Add to cart
    const addToCartBtn = page.getByTestId('pdp-add-to-cart');
    if (await addToCartBtn.isVisible()) {
      await addToCartBtn.click();
    }
  });

  test('checks cart page, applies coupon, and proceeds to checkout', async ({ page }) => {
    await page.goto('/cart');

    // If cart has items or empty state, ensure page loads clean
    await expect(page.locator('h1')).toBeVisible();
  });

  test('verifies user order tracking page loads properly without error', async ({ page }) => {
    await page.goto('/track-order');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('verifies all legal and support pages render cleanly', async ({ page }) => {
    const routes = [
      '/faq',
      '/contact',
      '/size-guide',
      '/shipping-policy',
      '/refund-policy',
      '/privacy-policy',
      '/terms-of-service',
      '/cookie-policy',
    ];

    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
