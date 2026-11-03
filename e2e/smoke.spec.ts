import { test, expect } from '@playwright/test'

test.describe('public shell', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Dayact' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
  })

  test('protected route redirects to login', async ({ page }) => {
    await page.goto('/today')
    await expect(page).toHaveURL(/\/login/)
  })
})
