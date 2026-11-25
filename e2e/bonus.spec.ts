import { expect, test } from '@playwright/test'
import { createPost, register } from './helpers'

test('THM-01 Time Travel theme switches via tokens and persists after reload', async ({ page }) => {
  await register(page)
  const html = page.locator('html')
  await expect(html).not.toHaveAttribute('data-theme', /.+/)
  await page.getByRole('button', { name: '2010' }).click()
  await expect(html).toHaveAttribute('data-theme', '2010')
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', '2010')
  await page.getByRole('button', { name: '2015' }).click()
  await expect(html).not.toHaveAttribute('data-theme', /.+/)
})

test('FRD-06 block hides the profile both ways and can be undone from Blocked People', async ({ browser, page }) => {
  await register(page)
  const bobContext = await browser.newContext()
  const bobPage = await bobContext.newPage()
  const bob = await register(bobPage)

  await page.goto(`/${bob.username}`)
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByRole('button', { name: 'Block', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)

  await page.goto('/me/blocked')
  await expect(page.getByText(bob.displayName)).toBeVisible()
  await page.getByRole('button', { name: 'Unblock' }).click()
  await expect(page.getByText("You haven't blocked anyone.")).toBeVisible()
  await bobContext.close()
})

test('ACT-01 activity log lists own post and deleting it there removes it', async ({ page }) => {
  await register(page)
  const content = `Activity ${Date.now()}`
  await createPost(page, content, 'PUBLIC')
  await page.goto('/me/activity')
  const row = page.locator('.row').filter({ hasText: content })
  await expect(row).toBeVisible()
  page.once('dialog', (dialog) => void dialog.accept())
  await row.getByRole('button', { name: 'Delete' }).click()
  await expect(row).toHaveCount(0)
  await page.goto('/')
  await expect(page.locator('.post').filter({ hasText: content })).toHaveCount(0)
})
