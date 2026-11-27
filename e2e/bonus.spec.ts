import { readFile, readdir } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { ADMIN_URL, createPost, loginAsNewAdmin, register } from './helpers'

// fixme: ThemeSwitcher is not mounted in the UI (removed in 73922da); re-enable once it is back.
test.fixme('THM-01 Time Travel theme switches via tokens and persists after reload', async ({
  page,
}) => {
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

test('FRD-06 block hides the profile both ways and can be undone from Blocked People', async ({
  browser,
  page,
}) => {
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

test('SPN-01 admin publishes a Sponsored card that members see, and removes it', async ({
  browser,
  page,
}) => {
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
  await expect(page.locator('.pcard').filter({ hasText: title })).toBeVisible()
  await expect(page.getByRole('link', { name: new RegExp(title) })).toHaveAttribute(
    'href',
    'https://example.com/promo',
  )

  await admin.page
    .locator('.announce-list li')
    .filter({ hasText: title })
    .getByRole('button', { name: 'Hapus' })
    .click()
  await expect(admin.page.locator('.announce-list li').filter({ hasText: title })).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.pcard').filter({ hasText: title })).toHaveCount(0)
  await admin.context.close()
})

test('ADM-17 hiding a hashtag removes it from trending', async ({ browser, page }) => {
  await register(page)
  // Tag acak (bukan Date.now yang bisa jadi potongan tag lain) dan lima pemakaian: trending hanya memuat
  // 10 tag teratas dalam 24 jam, jadi tag sekali pakai dari tes lain bisa mengalahkannya.
  const tag = `tag${randomBytes(5).toString('hex')}`
  for (let i = 0; i < 5; i++) await createPost(page, `Halo ${i} #${tag}`, 'PUBLIC')
  const trending = () => page.locator('.pcard').filter({ hasText: 'Trending' })
  await page.reload()
  // Awal harus terbukti ada; tanpa ini pemeriksaan "hilang" di bawah bisa lolos tanpa makna.
  await expect(trending().getByText(`#${tag}`)).toBeVisible()

  const admin = await loginAsNewAdmin(browser)
  await admin.page.goto(`${ADMIN_URL}/trending`)
  await admin.page.getByLabel('Cari hashtag').fill(tag)
  await admin.page.getByRole('button', { name: 'Cari' }).click()
  // Tunggu hasil pencarian stabil (satu baris) sebelum mengklik: daftar awal yang belum difilter masih
  // bisa tampil, dan baris dari daftar itu akan diganti oleh hasil pencarian.
  await expect(admin.page.locator('.announce-list li')).toHaveCount(1)
  // Baris dipilih lewat teks tag yang persis sama, supaya baris tag lain dari run sebelumnya tidak ikut.
  const row = admin.page
    .locator('.announce-list li')
    .filter({ has: admin.page.getByText(`#${tag}`, { exact: true }) })
  await row.getByRole('button', { name: 'Sembunyikan' }).click()
  await expect(row.getByText('Disembunyikan dari trending')).toBeVisible()

  await page.reload()
  await expect(trending().getByText(`#${tag}`)).toHaveCount(0)
  await admin.context.close()
})

test('AUTH-05 forgotten password: reset link from the outbox sets a new password', async ({
  browser,
}) => {
  const ctx = await browser.newContext()
  const member = await ctx.newPage()
  const user = await register(member)
  await ctx.close()

  const guestCtx = await browser.newContext()
  const page = await guestCtx.newPage()
  await page.goto('/login')
  await page.getByRole('link', { name: 'Forgotten your password?' }).click()
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()
  await page.getByLabel('Email', { exact: true }).fill(`${user.username}@example.com`)
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByText(/reset link is on its way/)).toBeVisible()

  // Penyedia email belum ada: API menulis email ke apps/api/outbox (hanya di non-production).
  const outbox = join(process.cwd(), 'apps/api/outbox')
  let link = ''
  await expect
    .poll(async () => {
      const files = (await readdir(outbox).catch(() => [])).sort()
      for (const file of files.reverse()) {
        const text = await readFile(join(outbox, file), 'utf8')
        if (text.includes(`To: ${user.username}@example.com`)) {
          link = /http\S+reset-password\?token=\S+/.exec(text)?.[0] ?? ''
          return link
        }
      }
      return ''
    })
    .not.toBe('')

  await page.goto(link.replace(/^https?:\/\/[^/]+/, ''))
  await page.getByLabel('New password (min. 8 characters)').fill('brand-new-password')
  await page.getByRole('button', { name: 'Save password' }).click()
  await expect(page.getByText('Your password was changed.')).toBeVisible()

  await page.goto('/login')
  await page.getByLabel('Email or username').fill(user.username)
  await page.getByLabel('Password', { exact: true }).fill('brand-new-password')
  await page.getByRole('button', { name: 'Log In' }).click()
  await expect(page.getByLabel("What's on your mind?")).toBeVisible()
  await guestCtx.close()
})
