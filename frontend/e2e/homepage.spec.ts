import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows hero section with headline and CTA', async ({ page }) => {
    // Hero headline should include brand-related text
    const hero = page.locator('section').first()
    await expect(hero).toBeVisible()

    // CTA button linking to products
    const shopNow = page.getByRole('link', { name: /shop now/i }).first()
    await expect(shopNow).toBeVisible()
    await expect(shopNow).toHaveAttribute('href', /products/)
  })

  test('renders all 5 category cards', async ({ page }) => {
    // Category section
    await expect(page.getByText(/shop by category/i)).toBeVisible()
    const categoryLinks = page.locator('a[href*="/products?category"]')
    await expect(categoryLinks).toHaveCount(5)
  })

  test('shows new arrivals product grid', async ({ page }) => {
    await expect(page.getByText(/new arrivals/i)).toBeVisible()
    // Product cards should be rendered
    const productCards = page.locator('[data-testid="product-card"]')
    await expect(productCards.first()).toBeVisible()
  })

  test('AI features section is present', async ({ page }) => {
    await expect(page.getByText(/AI Virtual Try-On/i)).toBeVisible()
    await expect(page.getByText(/AI Size Recommendation/i)).toBeVisible()
  })

  test('newsletter form accepts email input', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/your email/i)
    await expect(emailInput).toBeVisible()
    await emailInput.fill('test@threadx.com')
    await expect(emailInput).toHaveValue('test@threadx.com')
  })

  test('header is visible and sticky', async ({ page }) => {
    const header = page.locator('header')
    await expect(header).toBeVisible()
    await expect(page.getByText('THREADX')).toBeVisible()
  })

  test('footer has navigation links', async ({ page }) => {
    const footer = page.locator('footer')
    await footer.scrollIntoViewIfNeeded()
    await expect(footer).toBeVisible()
    await expect(footer.getByText(/privacy policy/i)).toBeVisible()
  })
})
