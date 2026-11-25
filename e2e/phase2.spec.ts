import { randomBytes } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { makeFriends, register } from './helpers'

test('E2E-06 two-way realtime chat with typing and seen indicators', async ({ browser, page }) => {
  const alice = await register(page)
  const { bobContext, bobPage, bob } = await makeFriends(browser, page, alice.displayName)
  await page.goto('/')
  await bobPage.goto('/')

  // Alice opens a chat window with Bob from the sidebar.
  await page
    .getByRole('button', { name: new RegExp(bob.displayName) })
    .first()
    .click()
  const aliceWin = page.locator('.win').filter({ hasText: bob.displayName })
  const hello = `Hello Bob ${randomBytes(3).toString('hex')}`
  await aliceWin.getByLabel('Write a message...').fill(hello)
  await aliceWin.getByLabel('Write a message...').press('Enter')

  // Bob receives it without reloading; his window opens when he clicks Alice's row.
  await bobPage
    .getByRole('button', { name: new RegExp(alice.displayName) })
    .first()
    .click()
  const bobWin = bobPage.locator('.win').filter({ hasText: alice.displayName })
  await expect(bobWin.getByText(hello)).toBeVisible()
  // Reading Bob's window marks the message as seen for Alice.
  await expect(aliceWin.getByText('Seen')).toBeVisible()

  // Bob types: Alice sees the typing indicator.
  await bobWin.getByLabel('Write a message...').pressSequentially('Hi Alice')
  await expect(aliceWin.getByText(`${bob.displayName} is typing...`)).toBeVisible()

  // Bob replies; Alice receives it in real time.
  await bobWin.getByLabel('Write a message...').press('Enter')
  await expect(aliceWin.getByText('Hi Alice')).toBeVisible()
  await bobContext.close()
})

test('E2E-07 wall post shows as Alice ▸ Bob and Bob can delete it', async ({ browser, page }) => {
  const alice = await register(page)
  const { bobContext, bobPage, bob } = await makeFriends(browser, page, alice.displayName)
  const content = `Wall post ${randomBytes(4).toString('hex')}`

  await page.goto(`/${bob.username}`)
  await page.getByLabel(`Write something to ${bob.displayName}...`).fill(content)
  await page.getByRole('button', { name: 'Post', exact: true }).click()
  const alicePost = page.locator('.post').filter({ hasText: content })
  const names = alicePost.locator('.post__who .post__name')
  await expect(names).toHaveText([alice.displayName, bob.displayName])
  await expect(alicePost.locator('.post__arrow')).toHaveText('▸')

  await bobPage.goto(`/${bob.username}`)
  const bobPost = bobPage.locator('.post').filter({ hasText: content })
  await expect(bobPost.locator('.post__who')).toContainText(alice.displayName)
  bobPage.once('dialog', (dialog) => dialog.accept())
  await bobPost.getByRole('button', { name: 'Post options' }).click()
  await bobPost.getByRole('button', { name: 'Delete' }).click()
  await expect(bobPage.locator('.post').filter({ hasText: content })).toHaveCount(0)
  await bobContext.close()
})
