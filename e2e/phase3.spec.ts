import { randomBytes } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { ADMIN_URL, createPost, loginAsNewAdmin, register, userId } from './helpers'

const apiLogin = `http://127.0.0.1:${process.env.E2E_API_PORT ?? '3031'}/api/auth/login`

test('E2E-08 member reports a post; admin decides in two clicks; audit log records it', async ({ browser, page }) => {
  const author = await register(page)
  const content = `Spam ${randomBytes(4).toString('hex')}`
  await createPost(page, content, 'PUBLIC')

  const reporterContext = await browser.newContext()
  const reporter = await reporterContext.newPage()
  await register(reporter)
  await reporter.goto(`/${author.username}`)
  const card = reporter.locator('.post').filter({ hasText: content })
  await card.getByRole('button', { name: 'Post options' }).click()
  await card.getByRole('button', { name: 'Report' }).click()
  await reporter.getByLabel("It's spam").check()
  await reporter.getByRole('button', { name: 'Submit report' }).click()
  await expect(reporter.getByText('Thanks for letting us know')).toBeVisible()

  const admin = await loginAsNewAdmin(browser)
  await admin.page.goto(`${ADMIN_URL}/reports`)
  await admin.page.locator('.reports-item').filter({ hasText: content }).click() // klik 1: pilih laporan
  await admin.page.getByRole('button', { name: 'Sembunyikan' }).click() // klik 2: putuskan
  await expect(admin.page.getByText('Keputusan tersimpan dan tercatat di audit.')).toBeVisible()

  await admin.page.goto(`${ADMIN_URL}/audit-logs`)
  await admin.page.getByLabel('Aksi').fill('REPORT_REVIEWED_HIDE_CONTENT')
  await admin.page.getByRole('button', { name: 'Terapkan' }).click()
  await expect(admin.page.locator('.audit-table tbody tr').filter({ hasText: `@${admin.admin.username}` }).first()).toBeVisible()

  // Keputusan itu menyembunyikan post bagi pelapor.
  await reporter.reload()
  await expect(reporter.locator('.post').filter({ hasText: content })).toHaveCount(0)
  await admin.context.close()
  await reporterContext.close()
})

test('E2E-09 admin hides a post: gone in the user app, still visible in the admin panel', async ({ browser, page }) => {
  const author = await register(page)
  const content = `Hide me ${randomBytes(4).toString('hex')}`
  await createPost(page, content, 'PUBLIC')

  const viewerContext = await browser.newContext()
  const viewer = await viewerContext.newPage()
  await register(viewer)
  await viewer.goto(`/${author.username}`)
  await expect(viewer.locator('.post').filter({ hasText: content })).toBeVisible()

  const admin = await loginAsNewAdmin(browser)
  await admin.page.goto(`${ADMIN_URL}/moderation`)
  await admin.page.getByPlaceholder(/Cari isi/).fill(content)
  const row = admin.page.locator('tr').filter({ hasText: content })
  await row.getByRole('button', { name: 'Sembunyikan' }).click()
  await expect(admin.page.getByText('Konten disembunyikan.')).toBeVisible()
  await expect(row.getByText('Disembunyikan')).toBeVisible()

  await viewer.reload()
  await expect(viewer.locator('.post').filter({ hasText: content })).toHaveCount(0)
  await admin.context.close()
  await viewerContext.close()
})

test('E2E-10 suspending a user ends the active session and blocks login', async ({ browser, page }) => {
  const member = await register(page)
  const id = await userId(member.username)

  const admin = await loginAsNewAdmin(browser)
  admin.page.on('dialog', (dialog) => void dialog.accept('spam'))
  await admin.page.goto(`${ADMIN_URL}/users/${id}`)
  await admin.page.getByRole('button', { name: 'Tangguhkan akun' }).click()
  await expect(admin.page.getByText('Status pengguna berhasil diperbarui.')).toBeVisible()

  await page.reload()
  await expect(page).toHaveURL(/\/login/)
  const res = await fetch(apiLogin, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: member.username, password: 'phase1-demo-password' }),
  })
  expect(res.status).toBe(403)
  expect(((await res.json()) as { code: string }).code).toBe('ACCOUNT_SUSPENDED')
  await admin.context.close()
})

test('ADM-13 announcement shows as feed banner and notification, and disappears when deleted', async ({ browser, page }) => {
  await register(page)
  const title = `Notice ${randomBytes(4).toString('hex')}`
  const admin = await loginAsNewAdmin(browser)
  admin.page.on('dialog', (dialog) => void dialog.accept())
  await admin.page.goto(`${ADMIN_URL}/announcements`)
  await admin.page.getByLabel('Judul').fill(title)
  await admin.page.getByLabel('Isi').fill('Isi pengumuman')
  await admin.page.getByRole('button', { name: 'Terbitkan' }).click()
  await expect(admin.page.getByText(/Pengumuman terbit/)).toBeVisible()

  await page.goto('/')
  await expect(page.locator('.banner').filter({ hasText: title })).toBeVisible()

  await admin.page.locator('.announce-list li').filter({ hasText: title }).getByRole('button', { name: 'Hapus' }).click()
  await expect(admin.page.locator('.announce-list li').filter({ hasText: title })).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.banner').filter({ hasText: title })).toHaveCount(0)
  await admin.context.close()
})

test('ADM-11 blocked word: content is still published but flagged for moderation', async ({ browser, page }) => {
  await register(page)
  const word = `kata${randomBytes(4).toString('hex')}`
  const admin = await loginAsNewAdmin(browser)
  await admin.page.goto(`${ADMIN_URL}/blocked-words`)
  await admin.page.getByLabel('Kata baru').fill(word)
  await admin.page.getByRole('button', { name: 'Tambah' }).click()
  await expect(admin.page.getByText(`"${word}" ditambahkan`)).toBeVisible()

  const content = `Ini ${word} ya`
  await createPost(page, content, 'PUBLIC') // tidak ditolak

  await admin.page.goto(`${ADMIN_URL}/moderation`)
  await admin.page.getByLabel('Filter').selectOption('flagged')
  await expect(admin.page.locator('tr').filter({ hasText: content })).toBeVisible()
  await admin.context.close()
})
