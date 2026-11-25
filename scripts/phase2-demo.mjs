import { copyFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'

// Demo Fase 2: chat realtime dua arah (mengetik, Seen), jewel, dan wall post Alice ▸ Bob.
const outputDir = join(process.cwd(), 'docs/demo')
const baseURL = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:5176'
const size = { width: 1440, height: 900 }
const browser = await chromium.launch({ headless: true })
const aliceCtx = await browser.newContext({ viewport: size, recordVideo: { dir: outputDir, size } })
const bobCtx = await browser.newContext({ viewport: size })
const alice = await aliceCtx.newPage()
const bob = await bobCtx.newPage()
await mkdir(outputDir, { recursive: true })

async function login(page, username) {
  await page.goto(`${baseURL}/login`)
  await page.getByLabel('Email or username').fill(username)
  await page.getByLabel('Password').fill('retrobook-demo')
  await page.getByRole('button', { name: 'Log In' }).click()
  await page.getByLabel("What's on your mind?").waitFor()
}

try {
  await Promise.all([login(alice, 'alice'), login(bob, 'bob')])
  const stamp = new Date().toISOString().slice(11, 16)

  await alice
    .getByRole('button', { name: /Bob Miller/ })
    .first()
    .click()
  const aliceWin = alice.locator('.win').filter({ hasText: 'Bob Miller' })
  await aliceWin.getByLabel('Write a message...').fill(`Hey Bob, remember 2015? (${stamp})`)
  await aliceWin.getByLabel('Write a message...').press('Enter')
  await bob
    .getByRole('button', { name: /Alice Chen/ })
    .first()
    .click()
  const bobWin = bob.locator('.win').filter({ hasText: 'Alice Chen' })
  await bobWin.getByText(`(${stamp})`).waitFor()
  await aliceWin.getByText('Seen').waitFor()
  await bobWin
    .getByLabel('Write a message...')
    .pressSequentially('Of course! Wall post incoming?', { delay: 60 })
  await aliceWin.getByText('Bob Miller is typing...').waitFor()
  await alice.screenshot({ path: join(outputDir, 'phase2-chat.png') })
  await bobWin.getByLabel('Write a message...').press('Enter')
  await aliceWin.getByText('Of course! Wall post incoming?').waitFor()

  await alice.goto(`${baseURL}/bob`)
  const wall = `Throwback wall post — ${stamp}`
  await alice.getByLabel('Write something to Bob Miller...').fill(wall)
  await alice.getByRole('button', { name: 'Post', exact: true }).click()
  await alice.getByText(wall).waitFor()
  await alice.waitForTimeout(800)
  await alice.screenshot({ path: join(outputDir, 'phase2-wall.png'), fullPage: true })

  const video = alice.video()
  await Promise.all([aliceCtx.close(), bobCtx.close()])
  await browser.close()
  if (video) await copyFile(await video.path(), join(outputDir, 'phase2-demo.webm'))
  console.info(`Saved Phase 2 demo assets in ${outputDir}`)
} catch (error) {
  await Promise.all([aliceCtx.close(), bobCtx.close()])
  await browser.close()
  throw error
}
