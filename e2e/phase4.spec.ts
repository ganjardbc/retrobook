import { randomBytes } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { createPost, makeFriends, prismaForE2E, register, userId } from './helpers'

const yearsAgo = (n: number) => {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear() - n, d.getUTCMonth(), d.getUTCDate(), 12))
}

/** Isi post lama langsung ke DB uji (UI tidak bisa membuat post bertanggal lampau). */
async function seedPost(username: string, content: string, createdAt: Date, imageUrl?: string) {
  const prisma = prismaForE2E()
  try {
    await prisma.post.create({
      data: { authorId: await userId(username), content, createdAt, privacy: 'ONLY_ME', imageUrl },
    })
  } finally {
    await prisma.$disconnect()
  }
}

test('SAV-01 save a post, find it in Saved, unsave removes it', async ({ page }) => {
  await register(page)
  const content = `Save me ${randomBytes(4).toString('hex')}`
  await createPost(page, content, 'PUBLIC')

  const post = page.locator('.post').filter({ hasText: content })
  await post.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(post.getByRole('button', { name: 'Unsave', exact: true })).toBeVisible()

  await page.goto('/saved')
  const saved = page.locator('.post').filter({ hasText: content })
  await expect(saved).toBeVisible()
  await saved.getByRole('button', { name: 'Unsave', exact: true }).click()
  await page.reload()
  await expect(page.getByText('Nothing saved yet')).toBeVisible()
})

test('OTD-01 On This Day shows own post from the same date last year', async ({ page }) => {
  const me = await register(page)
  const old = `Throwback ${randomBytes(4).toString('hex')}`
  await seedPost(me.username, old, yearsAgo(1))
  await seedPost(
    me.username,
    `Other day ${randomBytes(4).toString('hex')}`,
    new Date(yearsAgo(1).getTime() + 3 * 86_400_000),
  )

  await page.goto('/on-this-day')
  await expect(page.locator('.post').filter({ hasText: old })).toBeVisible()
  await expect(page.locator('.post').filter({ hasText: 'Other day' })).toHaveCount(0)
})

test('YIR-01 Year in Review summarises last year and switches years', async ({ page }) => {
  const me = await register(page)
  await seedPost(
    me.username,
    `Y1 ${randomBytes(3).toString('hex')}`,
    yearsAgo(1),
    '/uploads/none.png',
  )
  await seedPost(me.username, `Y2 ${randomBytes(3).toString('hex')}`, yearsAgo(1))
  await seedPost(me.username, `Y3 ${randomBytes(3).toString('hex')}`, yearsAgo(2))

  await page.goto('/year-in-review')
  const lastYear = String(new Date().getUTCFullYear() - 1)
  await page.getByRole('button', { name: lastYear }).click()
  await expect(
    page.getByRole('heading', { name: new RegExp(`${lastYear} in Review`) }),
  ).toBeVisible()
  await expect(
    page.locator('.yir__stats div').filter({ hasText: 'Posts' }).locator('dd'),
  ).toHaveText('2')
  await expect(
    page.locator('.yir__stats div').filter({ hasText: 'Photos' }).locator('dd'),
  ).toHaveText('1')
})

test('SRC-05 post search follows privacy: friend finds a FRIENDS post, stranger does not', async ({
  browser,
  page,
}) => {
  const alice = await register(page)
  const { bobContext, bobPage } = await makeFriends(browser, page, alice.displayName)
  const word = `kopi${randomBytes(4).toString('hex')}`
  await page.goto('/')
  await createPost(page, `Pagi ${word}`, 'FRIENDS')

  await bobPage.goto(`/search?q=${word}&type=posts`)
  await expect(bobPage.locator('.post').filter({ hasText: word })).toBeVisible()

  const strangerContext = await browser.newContext()
  const stranger = await strangerContext.newPage()
  await register(stranger)
  await stranger.goto(`/search?q=${word}&type=posts`)
  await expect(stranger.getByText(`No results for "${word}"`)).toBeVisible()
  await expect(stranger.locator('.post')).toHaveCount(0)
  await Promise.all([bobContext.close(), strangerContext.close()])
})

test('INT-03 like and unlike a comment updates the count', async ({ page }) => {
  await register(page)
  const content = `Comment like ${randomBytes(4).toString('hex')}`
  await createPost(page, content, 'PUBLIC')
  const post = page.locator('.post').filter({ hasText: content })
  await post.getByLabel('Write a comment...').fill('nice')
  await post.getByLabel('Write a comment...').press('Enter')
  const comment = post.getByText('nice').locator('xpath=ancestor::*[contains(@class,"comment")][1]')
  await comment.getByRole('button', { name: 'Like', exact: true }).click()
  await expect(comment.locator('.comment__likes')).toContainText('1')
  await comment.getByRole('button', { name: 'Unlike', exact: true }).click()
  await expect(comment.locator('.comment__likes')).toHaveCount(0)
})

const PASSWORD = 'phase1-demo-password'

test('GRP-01 create a group, post in it, and a non-member joins to read', async ({
  browser,
  page,
}) => {
  await register(page)
  const name = `Retro Club ${randomBytes(3).toString('hex')}`
  await page.goto('/groups')
  await page.getByRole('button', { name: 'Create Group' }).click()
  await page.getByLabel('Group name').fill(name)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await page.getByRole('link', { name }).click()
  const content = `Group post ${randomBytes(3).toString('hex')}`
  await page.getByLabel('Write something to the group...').fill(content)
  await page.getByRole('button', { name: 'Post', exact: true }).click()
  await expect(page.locator('.post').filter({ hasText: content })).toBeVisible()

  const otherContext = await browser.newContext()
  const other = await otherContext.newPage()
  await register(other)
  await other.goto('/groups')
  const row = other.locator('li').filter({ hasText: name })
  await row.getByRole('button', { name: 'Join' }).click()
  await other.getByRole('link', { name }).click()
  await expect(other.locator('.post').filter({ hasText: content })).toBeVisible()
  await otherContext.close()
})

test('EVT-01 create an event and RSVP Going', async ({ page }) => {
  await register(page)
  const title = `Reunion ${randomBytes(3).toString('hex')}`
  await page.goto('/events')
  await page.getByRole('button', { name: 'Create Event' }).click()
  await page.getByLabel('Event name').fill(title)
  const when = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 16)
  await page.getByLabel('Date and time').fill(when)
  await page.getByRole('button', { name: 'Create', exact: true }).click()
  await page
    .getByRole('link', { name: new RegExp(title) })
    .first()
    .click()
  await expect(page).toHaveURL(/\/events\/\d+/)
  const main = page.getByRole('main') // kartu Events today di kolom kanan juga punya tombol Going
  await main.getByRole('button', { name: 'Going', exact: true }).click()
  await expect(main.getByText('1 going')).toBeVisible()
})

test('NOT-01 write a note and it shows on the profile', async ({ page }) => {
  const me = await register(page)
  const title = `Note ${randomBytes(3).toString('hex')}`
  await page.goto(`/${me.username}/about`)
  await page.getByRole('button', { name: 'Write Note' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Note', { exact: true }).fill('Catatan panjang tentang 2015.')
  await page.getByRole('button', { name: 'Publish' }).click()
  await expect(page.getByText(title)).toBeVisible()
})

test('AUTH-06 delete account ends the session and blocks login', async ({ page }) => {
  const me = await register(page)
  await page.goto('/me/privacy')
  page.once('dialog', (dialog) => void dialog.accept())
  await page.getByLabel('Confirm password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Delete account', exact: true }).click()
  await expect(page).toHaveURL(/\/login/)
  await page.getByLabel('Email or username').fill(me.username)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Log In' }).click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByLabel("What's on your mind?")).toHaveCount(0)
})
