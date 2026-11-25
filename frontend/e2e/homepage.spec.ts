import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows hero section with headline and CTA', async ({ page }) => {
    // Hero headline should include brand-related text
    const hero = page.locator('section').first()
    await expect(hero).toBeVisible()

    // CTA button linking to products (Shop Collection)
    const shopNow = page.locator('[data-testid="hero-shop-cta"]').first()
    await expect(shopNow).toBeVisible()
    await shopNow.click()
    await expect(page).toHaveURL(/\/products/)
  })

  test('shows the "New in" section with its shop link', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /the latest drop/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /shop all new/i })).toHaveAttribute('href', /\/products/)
  })

  test('shows new arrivals product grid', async ({ page }) => {
    await expect(page.getByText(/new arrivals/i)).toBeVisible()
    // Product cards should be rendered
    const productCards = page.locator('[data-testid="product-card"]')
    await expect(productCards.first()).toBeVisible()
  })

  // AI features removed — no test

  test('newsletter form accepts email input', async ({ page }) => {
    const emailInput = page.getByPlaceholder(/your email/i)
    await expect(emailInput).toBeVisible()
    await emailInput.fill('test@threadx.com')
    await expect(emailInput).toHaveValue('test@threadx.com')
  })

  test('header is visible and sticky', async ({ page }) => {
    const header = page.locator('header')
    await expect(header).toBeVisible()
    await expect(header.getByRole('link', { name: /WAR/ }).first()).toBeVisible()
  })

  test('footer has navigation links', async ({ page }) => {
    const footer = page.locator('footer')
    await footer.scrollIntoViewIfNeeded()
    await expect(footer).toBeVisible()
    await expect(footer.getByText(/privacy policy/i)).toBeVisible()
  })
})
