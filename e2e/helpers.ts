import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { expect, type Browser, type Page } from '@playwright/test'

const password = 'phase1-demo-password'

export async function register(page: Page) {
  const suffix = randomBytes(5).toString('hex')
  const username = `e2e${suffix}`
  const displayName = `E2E ${suffix}`

  await page.goto('/register')
  await page.getByLabel('Display name').fill(displayName)
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Email').fill(`${username}@example.com`)
  await page.getByLabel('New password (min. 8 characters)').fill(password)
  await page.getByRole('button', { name: 'Sign Up' }).click()
  await expect(page).toHaveURL(/\/$/)
  return { username, displayName }
}

export async function createPost(
  page: Page,
  content: string,
  privacy: 'PUBLIC' | 'FRIENDS' | 'ONLY_ME',
) {
  await page.getByLabel("What's on your mind?").fill(content)
  await page.getByLabel('Who can see this post?').selectOption(privacy)
  await page.getByRole('button', { name: 'Post', exact: true }).click()
  await expect(page.locator('.post').filter({ hasText: content })).toBeVisible()
}

export async function makeFriends(browser: Browser, alicePage: Page, aliceDisplayName: string) {
  const bobContext = await browser.newContext()
  const bobPage = await bobContext.newPage()
  const bob = await register(bobPage)

  await alicePage.goto(`/${bob.username}`)
  await alicePage.getByRole('button', { name: 'Add Friend' }).click()
  await bobPage.goto('/friends')
  const request = bobPage.locator('.list li').filter({ hasText: aliceDisplayName })
  await request.getByRole('button', { name: 'Confirm' }).click()
  await expect(bobPage.locator('.list li').filter({ hasText: aliceDisplayName })).toBeVisible()
  await alicePage.goto(`/${bob.username}`)
  await expect(alicePage.getByRole('button', { name: 'Friends' })).toBeVisible()
  return { bobContext, bobPage, bob }
}

// --- Fase 3 (admin) ---
export const ADMIN_URL = `http://127.0.0.1:${process.env.E2E_ADMIN_PORT ?? '5184'}`
const requireFromApi = createRequire(resolve('apps/api/package.json'))

/** Klien Prisma ke database uji (skrip `test:e2e` mengisi DATABASE_URL). Hanya untuk menyiapkan data tes. */
export function prismaForE2E() {
  const { PrismaClient } = requireFromApi('@prisma/client') as typeof import('@prisma/client')
  return new PrismaClient()
}

export async function promoteToAdmin(username: string) {
  const prisma = prismaForE2E()
  try {
    await prisma.user.update({ where: { username }, data: { role: 'ADMIN' } })
  } finally {
    await prisma.$disconnect()
  }
}

export async function userId(username: string) {
  const prisma = prismaForE2E()
  try {
    return (await prisma.user.findUniqueOrThrow({ where: { username } })).id
  } finally {
    await prisma.$disconnect()
  }
}

/** Buat akun lewat UI user app, jadikan admin, lalu masuk ke admin panel di halaman yang diberikan. */
export async function loginAsNewAdmin(browser: Browser) {
  const context = await browser.newContext()
  // Admin default Inggris; skenario e2e admin menulis selector Indonesia, jadi pilih bahasa Indonesia untuk admin.
  await context.addInitScript(() => localStorage.setItem('rb.admin.locale', 'id'))
  const page = await context.newPage()
  const admin = await register(page)
  await promoteToAdmin(admin.username)
  await page.goto(`${ADMIN_URL}/login`)
  await page.getByLabel('Email atau username').fill(admin.username)
  await page.getByLabel('Kata sandi').fill(password)
  await page.getByRole('button', { name: /Masuk ke admin/ }).click()
  await expect(page.getByRole('heading', { name: /Ringkasan|Dashboard/i }).first()).toBeVisible()
  return { context, page, admin }
}
