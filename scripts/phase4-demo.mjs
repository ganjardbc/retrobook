import { copyFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { chromium } from '@playwright/test'

// Demo pasca-R4 (T-81 sampai T-84): Alice menyimpan post, membuka On This Day dan Year in Review,
// lalu mencari isi post. Prasyarat: seed dijalankan (akun alice / retrobook-demo), web dan API hidup,
// dan DATABASE_URL menunjuk DB yang sama dengan API (skrip menambah dua post lama milik alice).
//   DATABASE_URL=... DEMO_BASE_URL=http://127.0.0.1:5176 node scripts/phase4-demo.mjs
const outputDir = join(process.cwd(), 'docs/demo')
const webURL = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:5176'
const password = 'retrobook-demo'
const size = { width: 1440, height: 900 }
const { PrismaClient } = createRequire(resolve('apps/api/package.json'))('@prisma/client')
const prisma = new PrismaClient()
const lastYear = new Date().getUTCFullYear() - 1

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: size, recordVideo: { dir: outputDir, size } })
const page = await ctx.newPage()
await mkdir(outputDir, { recursive: true })

try {
  const alice = await prisma.user.findUniqueOrThrow({ where: { username: 'alice' } })
  await prisma.savedPost.deleteMany({ where: { userId: alice.id } }) // supaya demo bisa diulang
  const today = new Date()
  const sameDay = new Date(Date.UTC(lastYear, today.getUTCMonth(), today.getUTCDate(), 12))
  const stamp = Date.now()
  await prisma.post.createMany({
    data: [
      {
        authorId: alice.id,
        content: `Throwback coffee ${stamp}`,
        privacy: 'PUBLIC',
        createdAt: sameDay,
      },
      {
        authorId: alice.id,
        content: `Road trip memories ${stamp}`,
        privacy: 'PUBLIC',
        createdAt: new Date(Date.UTC(lastYear, 5, 12, 12)),
      },
    ],
  })

  await page.goto(`${webURL}/login`)
  await page.getByLabel('Email or username').fill('alice')
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Log In' }).click()
  await page.getByLabel("What's on your mind?").waitFor()

  // Save: simpan post pertama di feed lalu buka /saved.
  const first = page.locator('.post').first()
  await first.getByRole('button', { name: 'Save', exact: true }).click()
  await first.getByRole('button', { name: 'Unsave', exact: true }).waitFor()
  await page.goto(`${webURL}/saved`)
  await page.locator('.post').first().waitFor()
  await page.screenshot({ path: join(outputDir, 'phase4-saved.png') })

  // On This Day dan Year in Review.
  await page.goto(`${webURL}/on-this-day`)
  await page
    .locator('.post')
    .filter({ hasText: `Throwback coffee ${stamp}` })
    .waitFor()
  await page.screenshot({ path: join(outputDir, 'phase4-on-this-day.png') })
  await page.goto(`${webURL}/year-in-review`)
  await page.getByRole('button', { name: String(lastYear) }).click()
  await page.getByRole('heading', { name: `Your ${lastYear} in Review` }).waitFor()
  await page.locator('.yir__stats').waitFor()
  await page.screenshot({ path: join(outputDir, 'phase4-year-in-review.png') })

  // Cari isi post.
  await page.goto(`${webURL}/search?q=memories&type=posts`)
  await page
    .locator('.post')
    .filter({ hasText: `Road trip memories ${stamp}` })
    .waitFor()
  await page.screenshot({ path: join(outputDir, 'phase4-search-posts.png') })

  const video = page.video()
  await ctx.close()
  await browser.close()
  if (video) await copyFile(await video.path(), join(outputDir, 'phase4-demo.webm'))
  console.info(`Saved Phase 4 demo assets in ${outputDir}`)
} catch (error) {
  await ctx.close()
  await browser.close()
  throw error
} finally {
  await prisma.$disconnect()
}
