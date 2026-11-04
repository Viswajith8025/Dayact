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

async function clickMenuItem(page: Page, name: string) {
  const item = page.getByRole('menu').getByRole('menuitem', { name })
  await expect(item).toBeVisible()
  await item.evaluate((el) => (el as HTMLButtonElement).click())
}

async function deleteActivityRow(page: Page, title: string) {
  const row = page.getByRole('listitem').filter({ hasText: title })
  await row.scrollIntoViewIfNeeded()
  await row.getByRole('button', { name: 'Activity actions' }).click()
  await clickMenuItem(page, 'Delete')
  const deleteDone = waitForActivityDelete(page)
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
  await deleteDone
  await expect(page.getByText(title, { exact: false })).toHaveCount(0, { timeout: 15_000 })
}

async function cleanupQaActivities(page: Page) {
  await page.goto('/today')
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible({ timeout: 20_000 })

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const qaRow = page.getByRole('listitem').filter({ hasText: '[QA]' }).first()
    if ((await qaRow.count()) === 0) break
    const titleLine = (await qaRow.innerText()).split('\n')[0]?.trim()
    if (!titleLine) break
    await deleteActivityRow(page, titleLine)
  }
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

  test.afterEach(async ({ page }) => {
    if (!email || !password) return
    await cleanupQaActivities(page)
  })

  test('today page and navigation', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible()
    const followUps = page.getByRole('link', { name: 'Follow-ups' })
    await followUps.scrollIntoViewIfNeeded()
    await followUps.click()
    await expect(page).toHaveURL(/\/followups/)
    await expect(page.getByRole('heading', { name: 'Follow-ups' })).toBeVisible()
    const achievements = page.getByRole('link', { name: 'Achievements' })
    await achievements.scrollIntoViewIfNeeded()
    await achievements.click()
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

  test('today calendar jump opens in-app picker', async ({ page }) => {
    await page.getByRole('button', { name: 'Jump to date' }).click()
    const dialog = page.getByRole('dialog', { name: 'Pick a date' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Today' }).click()
    await expect(dialog).toHaveCount(0)
  })

  test('today shows productivity progress for signed-in user', async ({ page }) => {
    await expect(page.getByRole('progressbar', { name: 'You productivity' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Joint streak' })).toBeVisible()
  })

  test('activity row menu opens Edit action', async ({ page }) => {
    const title = `[QA] menu-${Date.now()}`
    await page.getByRole('button', { name: 'Add activity' }).click()
    await page.getByRole('textbox', { name: 'Title' }).fill(title)
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 })
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 })

    const row = page.getByRole('listitem').filter({ hasText: title })
    await row.scrollIntoViewIfNeeded()
    await row.getByRole('button', { name: 'Activity actions' }).click()
    await expect(page.getByRole('menu')).toBeVisible()
    await clickMenuItem(page, 'Edit')
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()

    await deleteActivityRow(page, title)
  })

  test('delete confirmation closes on Escape', async ({ page }) => {
    const title = `[QA] delete-escape-${Date.now()}`
    await page.getByRole('button', { name: 'Add activity' }).click()
    await page.getByRole('textbox', { name: 'Title' }).fill(title)
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 })
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 })

    const row = page.getByRole('listitem').filter({ hasText: title })
    await row.scrollIntoViewIfNeeded()
    await row.getByRole('button', { name: 'Activity actions' }).click()
    await clickMenuItem(page, 'Delete')
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('alertdialog')).toHaveCount(0)

    await deleteActivityRow(page, title)
  })

  test('lazy routes load', async ({ page }) => {
    await page.goto('/recap?recap=1')
    await expect(page.getByRole('heading', { level: 1, name: 'Recap' })).toBeVisible({ timeout: 15_000 })
    await page.goto('/heatmap')
    await expect(page.getByRole('heading', { name: 'Activity heatmap' })).toBeVisible({ timeout: 15_000 })
    await page.goto('/challenges')
    await expect(page.getByRole('heading', { name: 'Couple challenges' })).toBeVisible({ timeout: 15_000 })
  })

  test('weekly recap flag on today', async ({ page }) => {
    await page.goto('/today?recap=1')
    await expect(page.getByRole('region', { name: 'Weekly recap' })).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('login', () => {
  test('wrong password shows error', async ({ page }) => {
    test.skip(!email || !password, 'Set DAYACT_TEST_EMAIL and DAYACT_TEST_PASSWORD in .env')

    await page.goto('/login')
    await page.getByLabel('Email').fill(email!)
    await page.getByLabel('Password').fill('definitely-wrong-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
