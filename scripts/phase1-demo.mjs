import { copyFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

const outputDir = join(process.cwd(), 'docs/demo')
const baseURL = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:5176'
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: outputDir, size: { width: 1440, height: 900 } },
})
const page = await context.newPage()
await mkdir(outputDir, { recursive: true })

try {
  await page.goto(`${baseURL}/login`)
  await page.getByLabel('Email or username').fill('alice')
  await page.getByLabel('Password').fill('retrobook-demo')
  await page.getByRole('button', { name: 'Log In' }).click()
  await page.getByLabel("What's on your mind?").waitFor()

  const moment = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const demoPost = `Hello from the Retrobook Phase 1 demo — ${moment}.`
  await page.getByLabel("What's on your mind?").fill(demoPost)
  await page.getByLabel('Who can see this post?').selectOption('PUBLIC')
  await page.getByRole('button', { name: 'Post', exact: true }).click()
  await page.getByText(demoPost, { exact: true }).waitFor()
  await page.waitForTimeout(800)
  await page.screenshot({ path: join(outputDir, 'phase1-feed.png'), fullPage: true })

  await page.goto(`${baseURL}/alice`)
  await page.getByRole('heading', { name: 'Alice Chen' }).waitFor()
  await page.waitForTimeout(800)
  await page.screenshot({ path: join(outputDir, 'phase1-profile.png'), fullPage: true })

  const video = page.video()
  await context.close()
  await browser.close()
  if (video) await copyFile(await video.path(), join(outputDir, 'phase1-demo.webm'))
  console.info(`Saved Phase 1 demo assets in ${outputDir}`)
} catch (error) {
  await context.close()
  await browser.close()
  throw error
}
