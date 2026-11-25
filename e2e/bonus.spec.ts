import { expect, test } from '@playwright/test'
import { register } from './helpers'

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
