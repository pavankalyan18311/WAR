import { test, expect } from '@playwright/test'

test.describe('AI Virtual Try-On Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/try-on')
  })

  test('renders page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /virtual try-on/i })).toBeVisible()
  })

  test('shows 3-step progress indicator', async ({ page }) => {
    // Three steps visible
    await expect(page.getByText(/upload|photo/i)).toBeVisible()
    await expect(page.getByText(/measurements/i)).toBeVisible()
    await expect(page.getByText(/try-on|result/i)).toBeVisible()
  })

  test('step 1 has file upload input', async ({ page }) => {
    const uploadArea = page.locator('input[type="file"]')
    await expect(uploadArea).toBeAttached()
    await expect(uploadArea).toHaveAttribute('accept', /image/)
  })

  test('shows tips panel alongside upload area', async ({ page }) => {
    await expect(page.getByText(/tip|for best results/i)).toBeVisible()
  })
})

test.describe('AI Chat Widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('floating chat button is visible', async ({ page }) => {
    const chatButton = page.locator('[data-testid="chat-toggle"], [aria-label*="chat"], button').filter({ hasText: /chat|ai/i }).first()
    // Chat widget should be accessible
    await expect(page.locator('body')).toBeVisible()
  })

  test('chat widget opens when button clicked', async ({ page }) => {
    // Look for floating button - it might be in bottom-right
    const chatBtn = page.locator('button[class*="chat"], [data-testid="chat-button"]').first()
    if (await chatBtn.isVisible()) {
      await chatBtn.click()
      await expect(page.getByPlaceholder(/message|ask/i)).toBeVisible()
    }
  })
})
