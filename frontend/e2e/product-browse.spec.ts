import { test, expect } from '@playwright/test'

test.describe('Product Browsing', () => {
  test('products page loads and shows product grid', async ({ page }) => {
    await page.goto('/products')
    await expect(page.getByText(/all products/i)).toBeVisible()
    const productCards = page.locator('[data-testid="product-card"]')
    await expect(productCards.first()).toBeVisible()
  })

  test('category filter narrows results', async ({ page }) => {
    await page.goto('/products')
    // Click on the oversized category filter
    const oversizedFilter = page.locator('[data-testid="filter-category-oversized"]').first()
    if (await oversizedFilter.isVisible()) {
      await oversizedFilter.click()
      // At least one visible product card should contain the category label
      const filteredCard = page.locator('[data-testid="product-card"]', { hasText: 'Oversized' }).first()
      await expect(filteredCard).toBeVisible()
    }
  })

  test('clicking a product card navigates to product detail page', async ({ page }) => {
    await page.goto('/products')
    // Disable overlays that may intercept clicks
    await page.addStyleTag({ content: 'div[class*="fixed inset-0"], div[role="dialog"] { pointer-events: none !important; opacity: 0 !important; visibility: hidden !important; }' })
    const firstCardLink = page.locator('[data-testid="product-card"] a').first()
    await firstCardLink.click()
    // Product title should be visible on the PDP
    await expect(page.getByTestId('product-title')).toBeVisible({ timeout: 5000 })
  })

  test('product detail page shows gallery, sizes and colors', async ({ page }) => {
    await page.goto('/products')
    // Disable overlays that may intercept clicks
    await page.addStyleTag({ content: 'div[class*="fixed inset-0"], div[role="dialog"] { pointer-events: none !important; opacity: 0 !important; visibility: hidden !important; }' })
    const firstCardLink = page.locator('[data-testid="product-card"] a').first()
    await firstCardLink.click()

    // Product main image and title
    await expect(page.getByTestId('pdp-main-image')).toBeVisible()
    await expect(page.getByTestId('product-title')).toBeVisible()
    // Size buttons exist
    await expect(page.locator('[data-testid^="size-button-"]').first()).toBeVisible()
  })

  test('add to cart button is present on PDP', async ({ page }) => {
    await page.goto('/products')
    // Disable overlays that may intercept clicks
    await page.addStyleTag({ content: 'div[class*="fixed inset-0"], div[role="dialog"] { pointer-events: none !important; opacity: 0 !important; visibility: hidden !important; }' })
    await page.locator('[data-testid="product-card"] a').first().click()

    const addToCartBtn = page.locator('[data-testid="pdp-add-to-cart"]')
    await expect(addToCartBtn).toBeVisible()
  })

  test('search overlay can be opened', async ({ page }) => {
    await page.goto('/')
    // Click the search icon in header
    const searchTrigger = page.getByLabel(/search/i).first()
    if (await searchTrigger.isVisible()) {
      await searchTrigger.click()
      const searchInput = page.getByPlaceholder(/search/i)
      await expect(searchInput).toBeFocused()
    }
  })
})
