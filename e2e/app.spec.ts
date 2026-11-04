import { test, expect, type Page } from '@playwright/test'

const email = process.env.DAYACT_TEST_EMAIL
const password = process.env.DAYACT_TEST_PASSWORD

async function waitForActivityDelete(page: Page) {
  await page.waitForResponse(
    (response) =>
      response.url().includes('/rest/v1/activities') &&
      response.request().method() === 'DELETE' &&
      response.ok(),
    { timeout: 20_000 },
  )
}

async function deleteActivityRow(page: Page, title: string) {
  const row = page.getByRole('listitem').filter({ hasText: title })
  await row.getByRole('button', { name: 'Activity actions' }).click()
  await page.getByRole('menu').getByRole('menuitem', { name: 'Delete' }).click()
  const deleteDone = waitForActivityDelete(page)
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
  await deleteDone
  await expect(page.getByText(title)).toHaveCount(0, { timeout: 15_000 })
}

test.describe('signed-in flows', () => {
  test.describe.configure({ timeout: 60_000 })

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
    await page.getByRole('button', { name: 'Add activity' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('alert')).toContainText('Add a title')
  })

  test('dirty draft discard dialog keeps sheet open', async ({ page }) => {
    await page.getByRole('button', { name: 'Add activity' }).click()
    await page.getByRole('textbox', { name: 'Title' }).fill('[QA] draft test')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('alertdialog')).toContainText('Discard changes')
    await page.getByRole('button', { name: 'Keep editing' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
  })

  test('suggest titles shows friendly error on 502', async ({ page }) => {
    await page.route('**/api/suggest-activity', async (route) => {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid or unauthorized Gemini key' }),
      })
    })

    await page.getByRole('button', { name: 'Add activity' }).click()
    await page.getByRole('button', { name: 'Suggest titles' }).click()
    await expect(page.getByRole('alert')).toContainText('Suggestions unavailable right now')
    await expect(page.getByRole('button', { name: 'Suggest titles' })).toBeEnabled()
  })

  test('suggest titles shows slow hint after 5 seconds', async ({ page }) => {
    await page.route('**/api/suggest-activity', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 8000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ suggestions: ['One', 'Two', 'Three'] }),
      })
    })

    await page.getByRole('button', { name: 'Add activity' }).click()
    await page.getByRole('button', { name: 'Suggest titles' }).click()
    await expect(page.getByRole('status')).toContainText('Still working', { timeout: 7000 })
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

    await page.getByRole('button', { name: 'Add activity' }).click()
    await page.getByRole('button', { name: 'Suggest titles' }).click()
    await expect(page.getByRole('button', { name: 'Walk for 20 minutes' })).toBeVisible()
    await page.getByRole('button', { name: 'Walk for 20 minutes' }).click()
    await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Walk for 20 minutes')
  })

  test('activity row menu opens Edit action', async ({ page }) => {
    const title = `[QA] menu-${Date.now()}`
    await page.getByRole('button', { name: 'Add activity' }).click()
    await page.getByRole('textbox', { name: 'Title' }).fill(title)
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText(title)).toBeVisible()

    const row = page.getByRole('listitem').filter({ hasText: title })
    await row.getByRole('button', { name: 'Activity actions' }).click()
    await expect(page.getByRole('menu')).toBeVisible()
    await page.getByRole('menu').getByRole('menuitem', { name: 'Edit' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()

    await deleteActivityRow(page, title)
  })

  test('delete confirmation closes on Escape', async ({ page }) => {
    const title = `[QA] delete-escape-${Date.now()}`
    await page.getByRole('button', { name: 'Add activity' }).click()
    await page.getByRole('textbox', { name: 'Title' }).fill(title)
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText(title)).toBeVisible()

    const row = page.getByRole('listitem').filter({ hasText: title })
    await row.getByRole('button', { name: 'Activity actions' }).click()
    await page.getByRole('menu').getByRole('menuitem', { name: 'Delete' }).click()
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('alertdialog')).toHaveCount(0)

    await deleteActivityRow(page, title)
  })
})
