import { randomBytes } from 'node:crypto'
import { expect, test, type Browser, type Page } from '@playwright/test'

const password = 'phase1-demo-password'

async function register(page: Page) {
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

async function createPost(page: Page, content: string, privacy: 'PUBLIC' | 'FRIENDS' | 'ONLY_ME') {
  await page.getByLabel("What's on your mind?").fill(content)
  await page.getByLabel('Who can see this post?').selectOption(privacy)
  await page.getByRole('button', { name: 'Post', exact: true }).click()
  await expect(page.locator('.post').filter({ hasText: content })).toBeVisible()
}

async function makeFriends(browser: Browser, alicePage: Page, aliceDisplayName: string) {
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

test('E2E-01 register, start with an empty feed, and publish a post', async ({ page }) => {
  await register(page)
  await expect(page.getByRole('heading', { name: 'Your News Feed is empty' })).toBeVisible()
  await page.getByRole('button', { name: 'Write your first post' }).click()
  await expect(page.getByLabel("What's on your mind?")).toBeFocused()
  await createPost(page, `First post ${randomBytes(4).toString('hex')}`, 'PUBLIC')
})

test('E2E-02 send and accept a friend request', async ({ browser, page }) => {
  const alice = await register(page)
  const bobContext = await browser.newContext()
  const bobPage = await bobContext.newPage()
  const bob = await register(bobPage)

  await page.goto(`/${bob.username}`)
  await page.getByRole('button', { name: 'Add Friend' }).click()
  await bobPage.goto('/friends')
  const request = bobPage.locator('.list li').filter({ hasText: alice.displayName })
  await request.getByRole('button', { name: 'Confirm' }).click()
  await expect(bobPage.locator('.list li').filter({ hasText: alice.displayName })).toBeVisible()
  await page.goto(`/${bob.username}`)
  await expect(page.getByRole('button', { name: 'Friends' })).toBeVisible()
  await bobContext.close()
})

test('E2E-03 friends privacy is enforced in the feed', async ({ browser, page }) => {
  const alice = await register(page)
  const { bobContext, bobPage } = await makeFriends(browser, page, alice.displayName)
  const carolContext = await browser.newContext()
  const carolPage = await carolContext.newPage()
  await register(carolPage)

  const friendsPost = `Friends only ${randomBytes(4).toString('hex')}`
  const privatePost = `Only me ${randomBytes(4).toString('hex')}`
  await page.goto('/')
  await createPost(page, friendsPost, 'FRIENDS')
  await createPost(page, privatePost, 'ONLY_ME')

  await bobPage.goto('/')
  await expect(bobPage.locator('.post').filter({ hasText: friendsPost })).toBeVisible()
  await expect(bobPage.locator('.post').filter({ hasText: privatePost })).toHaveCount(0)
  await carolPage.goto('/')
  await expect(carolPage.locator('.post').filter({ hasText: friendsPost })).toHaveCount(0)
  await expect(carolPage.locator('.post').filter({ hasText: privatePost })).toHaveCount(0)

  await Promise.all([bobContext.close(), carolContext.close()])
})

test('E2E-04 like and comment on a visible post', async ({ browser, page }) => {
  const alice = await register(page)
  const { bobContext, bobPage } = await makeFriends(browser, page, alice.displayName)
  const content = `Interaction post ${randomBytes(4).toString('hex')}`
  await page.goto('/')
  await createPost(page, content, 'FRIENDS')

  await bobPage.goto('/')
  const post = bobPage.locator('.post').filter({ hasText: content })
  await post.getByRole('button', { name: 'Like', exact: true }).click()
  await expect(post.getByRole('button', { name: 'Unlike', exact: true })).toBeVisible()
  await post.getByLabel('Write a comment...').fill('Looks great!')
  await post.getByLabel('Write a comment...').press('Enter')
  await expect(post.getByText('Looks great!')).toBeVisible()
  await bobContext.close()
})

test('E2E-05 edit and delete a post', async ({ page }) => {
  await register(page)
  const original = `Original ${randomBytes(4).toString('hex')}`
  const updated = `Updated ${randomBytes(4).toString('hex')}`
  await createPost(page, original, 'PUBLIC')

  const post = page.locator('.post').filter({ hasText: original })
  await post.getByRole('button', { name: 'Post options' }).click()
  await post.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Edit your post').fill(updated)
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.locator('.post').filter({ hasText: updated })).toContainText('Edited')
  page.once('dialog', (dialog) => dialog.accept())
  const updatedPost = page.locator('.post').filter({ hasText: updated })
  await updatedPost.getByRole('button', { name: 'Post options' }).click()
  await updatedPost.getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('.post').filter({ hasText: updated })).toHaveCount(0)
})
