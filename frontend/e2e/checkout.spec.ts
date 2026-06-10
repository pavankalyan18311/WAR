import { test, expect } from '@playwright/test'

test.describe('Cart and Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a product and add it to cart
    await page.goto('/products')
    await page.locator('[data-testid="product-card"]').first().click()
    await page.waitForURL(/\/products\/[a-z0-9-]+/)

    // Select a size if selector is present
    const sizeBtn = page.getByRole('button', { name: /^(XS|S|M|L|XL|XXL)$/ }).first()
    if (await sizeBtn.isVisible()) {
      await sizeBtn.click()
    }
    const addToCart = page.getByRole('button', { name: /add to cart/i })
    await addToCart.click()
  })

  test('cart drawer opens after adding item', async ({ page }) => {
    const cartDrawer = page.locator('[data-testid="cart-drawer"]')
    await expect(cartDrawer).toBeVisible({ timeout: 3000 })
    // Item count badge in header should be ≥ 1
    const badge = page.locator('[data-testid="cart-badge"]')
    const count = await badge.textContent()
    expect(Number(count)).toBeGreaterThanOrEqual(1)
  })

  test('cart page shows added item', async ({ page }) => {
    await page.goto('/cart')
    const items = page.locator('[data-testid="cart-item"]')
    await expect(items.first()).toBeVisible()
  })

  test('coupon code SUMMER20 applies discount', async ({ page }) => {
    await page.goto('/cart')
    const couponInput = page.getByPlaceholder(/coupon/i)
    await couponInput.fill('SUMMER20')
    await page.getByRole('button', { name: /apply/i }).click()
    await expect(page.getByText(/20%|SUMMER20/i)).toBeVisible()
  })

  test('checkout flow completes through 3 steps', async ({ page }) => {
    await page.goto('/checkout')

    // Step 1 — Shipping address
    await page.getByLabel(/full name/i).fill('Test User')
    await page.getByLabel(/email/i).fill('test@threadx.com')
    await page.getByLabel(/phone/i).fill('9876543210')
    await page.getByLabel(/address/i).first().fill('123 Test Street')
    await page.getByLabel(/city/i).fill('Mumbai')
    await page.getByLabel(/state/i).fill('Maharashtra')
    await page.getByLabel(/pincode|zip/i).fill('400001')
    await page.getByRole('button', { name: /continue/i }).click()

    // Step 2 — Payment selection
    await expect(page.getByText(/payment/i)).toBeVisible()
    const codOption = page.getByLabel(/cash on delivery|cod/i)
    if (await codOption.isVisible()) {
      await codOption.click()
    }
    await page.getByRole('button', { name: /continue|place order/i }).click()

    // Step 3 — Review or success
    await expect(
      page.getByText(/confirm|order summary|success/i)
    ).toBeVisible({ timeout: 5000 })
  })
})
