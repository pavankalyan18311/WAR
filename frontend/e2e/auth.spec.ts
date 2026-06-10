import { test, expect } from '@playwright/test'

test.describe('Authentication Pages', () => {
  test('login page renders form', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByRole('heading', { name: /sign in|login|welcome back/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible()
  })

  test('register page renders form with password validation', async ({ page }) => {
    await page.goto('/auth/register')
    await expect(page.getByLabel(/name/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i).first()).toBeVisible()
  })

  test('shows password strength indicators on register page', async ({ page }) => {
    await page.goto('/auth/register')
    const passwordField = page.getByLabel(/password/i).first()
    await passwordField.fill('weak')
    // Strength indicators should appear
    await expect(page.getByText(/uppercase|special|8 char/i).first()).toBeVisible()
  })

  test('login page has link to register page', async ({ page }) => {
    await page.goto('/auth/login')
    const registerLink = page.getByRole('link', { name: /register|sign up|create account/i })
    await expect(registerLink).toBeVisible()
    await registerLink.click()
    await expect(page).toHaveURL(/register/)
  })

  test('register page has link back to login', async ({ page }) => {
    await page.goto('/auth/register')
    const loginLink = page.getByRole('link', { name: /sign in|login/i })
    await expect(loginLink).toBeVisible()
    await loginLink.click()
    await expect(page).toHaveURL(/login/)
  })

  test('login form shows error for empty submission', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByRole('button', { name: /sign in|login/i }).click()
    // HTML5 validation or custom error
    const emailInput = page.getByLabel(/email/i)
    const validationMessage = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    )
    expect(validationMessage.length).toBeGreaterThan(0)
  })
})
