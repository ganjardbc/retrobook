import { expect, test } from '@playwright/test'
import { ADMIN_URL, createPost, loginAsNewAdmin, register } from './helpers'

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

test('SPN-01 admin publishes a Sponsored card that members see, and removes it', async ({ browser, page }) => {
  await register(page)
  const title = `Promo ${Date.now()}`
  const admin = await loginAsNewAdmin(browser)
  admin.page.on('dialog', (dialog) => void dialog.accept())
  await admin.page.goto(`${ADMIN_URL}/sponsored`)
  await admin.page.getByLabel('Judul').fill(title)
  await admin.page.getByLabel('Isi').fill('Teks promosi')
  await admin.page.getByLabel('Tautan').fill('https://example.com/promo')
  await admin.page.getByRole('button', { name: 'Buat promosi' }).click()
  await expect(admin.page.getByText('Promosi dibuat.')).toBeVisible()

  await page.goto('/')
  await expect(page.locator('.card').filter({ hasText: title })).toBeVisible()
  await expect(page.getByRole('link', { name: new RegExp(title) })).toHaveAttribute('href', 'https://example.com/promo')

  await admin.page.locator('.announce-list li').filter({ hasText: title }).getByRole('button', { name: 'Hapus' }).click()
  await expect(admin.page.locator('.announce-list li').filter({ hasText: title })).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.card').filter({ hasText: title })).toHaveCount(0)
  await admin.context.close()
})

test('ADM-17 hiding a hashtag removes it from trending', async ({ browser, page }) => {
  await register(page)
  const tag = `tag${Date.now()}`
  await createPost(page, `Halo #${tag}`, 'PUBLIC')
  await page.goto('/')
  await expect(page.getByRole('link', { name: `#${tag}`, exact: true }).first()).toBeVisible()

  const admin = await loginAsNewAdmin(browser)
  await admin.page.goto(`${ADMIN_URL}/trending`)
  await admin.page.getByLabel('Cari hashtag').fill(tag)
  await admin.page.getByRole('button', { name: 'Cari' }).click()
  await admin.page.locator('.announce-list li').filter({ hasText: `#${tag}` }).getByRole('button', { name: 'Sembunyikan' }).click()
  await expect(admin.page.getByText('Disembunyikan dari trending')).toBeVisible()

  await page.reload()
  await expect(page.locator('.card').filter({ hasText: 'Trending' }).getByText(`#${tag}`)).toHaveCount(0)
  await admin.context.close()
})
