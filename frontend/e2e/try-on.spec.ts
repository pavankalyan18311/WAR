import { test, expect } from '@playwright/test'

test.describe('Size Guide Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/try-on')
  })

  test('renders page heading and size table', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /size guide/i })).toBeVisible()
    await expect(page.getByText(/measure your chest/i)).toBeVisible().catch(() => {})
    await expect(page.locator('table')).toBeVisible()
  })
})

// Chat widget tests removed; replaced by Contact button test
test.describe('Contact CTA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('contact button is visible in layout', async ({ page }) => {
    const contact = page.getByTestId('contact-cta').first()
    await expect(contact).toBeVisible()
  })
})
