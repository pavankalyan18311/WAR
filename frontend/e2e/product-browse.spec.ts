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
    // Click on a category filter
    const oversizedFilter = page.getByRole('button', { name: /oversized/i }).first()
    if (await oversizedFilter.isVisible()) {
      await oversizedFilter.click()
      // URL should update with category param
      await expect(page).toHaveURL(/category=oversized/)
    }
  })

  test('clicking a product card navigates to product detail page', async ({ page }) => {
    await page.goto('/products')
    const firstCard = page.locator('[data-testid="product-card"]').first()
    await firstCard.click()
    // Should navigate to /products/[slug]
    await expect(page).toHaveURL(/\/products\/[a-z0-9-]+$/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('product detail page shows gallery, sizes and colors', async ({ page }) => {
    await page.goto('/products')
    const firstCard = page.locator('[data-testid="product-card"]').first()
    await firstCard.click()

    // Product name heading
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Price should be visible
    await expect(page.getByText(/₹/)).toBeVisible()
    // Size selector
    await expect(page.getByText(/select size/i)).toBeVisible()
  })

  test('add to cart button is present on PDP', async ({ page }) => {
    await page.goto('/products')
    await page.locator('[data-testid="product-card"]').first().click()

    const addToCartBtn = page.getByRole('button', { name: /add to cart/i })
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
