import { copyFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

// Demo Fase 3 (R3): Bob melaporkan post Alice, admin memutuskan dalam dua klik, audit log mencatatnya.
// Prasyarat: seed dijalankan, web (5176), admin (5174), API hidup, dan satu akun seed berperan ADMIN
// (mis. `UPDATE users SET role='ADMIN' WHERE username='carol'`). Skrip tidak mengubah data peran sendiri.
const outputDir = join(process.cwd(), 'docs/demo')
const webURL = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:5176'
const adminURL = process.env.DEMO_ADMIN_URL ?? 'http://127.0.0.1:5174'
const adminUser = process.env.DEMO_ADMIN_USER ?? 'carol'
const password = 'retrobook-demo'
const size = { width: 1440, height: 900 }
const browser = await chromium.launch({ headless: true })
const adminCtx = await browser.newContext({ viewport: size, recordVideo: { dir: outputDir, size } })
const bobCtx = await browser.newContext({ viewport: size })
const admin = await adminCtx.newPage()
const author = await bobCtx.newPage()
await mkdir(outputDir, { recursive: true })

try {
  const stamp = new Date().toISOString().slice(11, 16)
  const content = `Demo spam post (${stamp})`

  await bob.goto(`${webURL}/login`)
  await bob.getByLabel('Email or username').fill('alice')
  await bob.getByLabel('Password').fill(password)
  await bob.getByRole('button', { name: 'Log In' }).click()
  await bob.getByLabel("What's on your mind?").fill(content)
  await bob.getByLabel('Who can see this post?').selectOption('PUBLIC')
  await bob.getByRole('button', { name: 'Post', exact: true }).click()
  await bob.locator('.post').filter({ hasText: content }).waitFor()

  const reporterCtx = await browser.newContext({ viewport: size })
  const reporter = await reporterCtx.newPage()
  await reporter.goto(`${webURL}/login`)
  await reporter.getByLabel('Email or username').fill('bob')
  await reporter.getByLabel('Password').fill(password)
  await reporter.getByRole('button', { name: 'Log In' }).click()
  await reporter.getByLabel("What's on your mind?").waitFor()
  await reporter.goto(`${webURL}/alice`)
  const card = reporter.locator('.post').filter({ hasText: content })
  await card.getByRole('button', { name: 'Post options' }).click()
  await card.getByRole('button', { name: 'Report' }).click()
  await reporter.getByLabel("It's spam").check()
  await reporter.getByRole('button', { name: 'Submit report' }).click()
  await reporter.getByText('Thanks for letting us know').waitFor()

  await admin.goto(`${adminURL}/login`)
  await admin.getByLabel('Email atau username').fill(adminUser)
  await admin.getByLabel('Kata sandi').fill(password)
  await admin.getByRole('button', { name: /Masuk ke admin/ }).click()
  await admin.waitForURL(/\/$/)
  await admin.goto(`${adminURL}/reports`)
  await admin.locator('.reports-item').filter({ hasText: content }).click()
  await admin.screenshot({ path: join(outputDir, 'phase3-reports.png') })
  await admin.getByRole('button', { name: 'Sembunyikan' }).click()
  await admin.getByText('Keputusan tersimpan dan tercatat di audit.').waitFor()
  await admin.goto(`${adminURL}/audit-logs`)
  await admin.locator('.audit-table tbody tr').first().waitFor()
  await admin.screenshot({ path: join(outputDir, 'phase3-audit.png') })

  const video = admin.video()
  await Promise.all([adminCtx.close(), bobCtx.close(), reporterCtx.close()])
  await browser.close()
  if (video) await copyFile(await video.path(), join(outputDir, 'phase3-demo.webm'))
  console.info(`Saved Phase 3 demo assets in ${outputDir}`)
} catch (error) {
  await Promise.all([adminCtx.close(), bobCtx.close()])
  await browser.close()
  throw error
}
