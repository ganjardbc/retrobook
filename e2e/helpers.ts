import { randomBytes } from 'node:crypto'
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
