import { test, expect } from '@playwright/test'

const email = process.env.DAYACT_TEST_EMAIL
const password = process.env.DAYACT_TEST_PASSWORD

test.describe('signed-in flows', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!email || !password, 'Set DAYACT_TEST_EMAIL and DAYACT_TEST_PASSWORD in .env')

    await page.goto('/login')
    await page.getByLabel('Email').fill(email!)
    await page.getByLabel('Password').fill(password!)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/today/, { timeout: 20_000 })
  })

  test('today page and navigation', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
    await page.getByRole('link', { name: 'Follow-ups' }).click()
    await expect(page).toHaveURL(/\/followups/)
    await expect(page.getByRole('heading', { name: 'Follow-ups' })).toBeVisible()
    await page.getByRole('link', { name: 'Achievements' }).click()
    await expect(page).toHaveURL(/\/achievements/)
    await expect(page.getByRole('heading', { name: 'Achievements' })).toBeVisible()
  })

  test('add sheet validates empty title', async ({ page }) => {
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('alert')).toContainText('Add a title')
  })

  test('suggest titles uses mocked AI in dev', async ({ page }) => {
    await page.route('**/api/suggest-activity', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          suggestions: ['Walk for 20 minutes', 'Reply to one email', 'Prep lunch'],
        }),
      })
    })

    await page.getByRole('button', { name: 'Add' }).click()
    await page.getByRole('button', { name: 'Suggest titles' }).click()
    await expect(page.getByRole('button', { name: 'Walk for 20 minutes' })).toBeVisible()
    await page.getByRole('button', { name: 'Walk for 20 minutes' }).click()
    await expect(page.getByLabel('Title')).toHaveValue('Walk for 20 minutes')
  })
})
