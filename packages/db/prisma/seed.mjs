import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const demoPasswordHash =
  '$argon2id$v=19$m=65536,t=3,p=4$qbLW7vgZD4VFM2ttdiKLeQ$jnhFgQUHsG84bxHhW+R0zthz/2/3fH4xFQdDGaCYQ+Y'

const people = [
  { username: 'alice', displayName: 'Alice Chen', email: 'alice@retrobook.demo' },
  { username: 'bob', displayName: 'Bob Miller', email: 'bob@retrobook.demo' },
  { username: 'carol', displayName: 'Carol Rivera', email: 'carol@retrobook.demo' },
  { username: 'dave', displayName: 'Dave Williams', email: 'dave@retrobook.demo' },
  { username: 'erin', displayName: 'Erin Walker', email: 'erin@retrobook.demo' },
  { username: 'frank', displayName: 'Frank Moore', email: 'frank@retrobook.demo' },
  { username: 'grace', displayName: 'Grace Lee', email: 'grace@retrobook.demo' },
  { username: 'henry', displayName: 'Henry Adams', email: 'henry@retrobook.demo' },
  { username: 'isla', displayName: 'Isla Martin', email: 'isla@retrobook.demo' },
  { username: 'jack', displayName: 'Jack Thompson', email: 'jack@retrobook.demo' },
]

const postSeed = [
  ['alice', 'A little sunshine makes this Monday better ☀', 'PUBLIC'],
  ['alice', 'Anyone up for coffee after work?', 'FRIENDS'],
  ['alice', 'Just for me: remember to call Mom.', 'ONLY_ME'],
  ['bob', 'Weekend photos are finally uploaded.', 'FRIENDS'],
  ['bob', 'Found a great new playlist for the drive home.', 'PUBLIC'],
  ['carol', 'Happy Friday, everyone!', 'PUBLIC'],
  ['carol', 'Trying a new recipe tonight.', 'FRIENDS'],
  ['dave', 'The view from the train never gets old.', 'PUBLIC'],
  ['erin', 'Book club is meeting at the library this week.', 'FRIENDS'],
  ['frank', 'A quiet Sunday with a good book.', 'PUBLIC'],
  ['grace', 'New photos from the garden.', 'PUBLIC'],
  ['henry', 'Who remembers this song from high school?', 'FRIENDS'],
  ['isla', 'Homemade pancakes for breakfast.', 'PUBLIC'],
  ['jack', 'Thanks for making this such a fun weekend!', 'FRIENDS'],
]

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo seed is disabled in production.')
  }

  const existing = await prisma.user.count({
    where: { username: { in: people.map((person) => person.username) } },
  })
  if (existing > 0) {
    if (existing !== people.length) {
      throw new Error('Partial demo accounts already exist; refusing to add duplicate seed data.')
    }
    console.info('Demo data already exists; nothing changed.')
    return
  }

  await prisma.$transaction(async (tx) => {
    const users = new Map()
    for (const person of people) {
      const user = await tx.user.create({
        data: { ...person, passwordHash: demoPasswordHash },
        select: { id: true },
      })
      users.set(person.username, user.id)
    }

    const addFriendship = async (from, to, status = 'ACCEPTED') => {
      const fromId = users.get(from)
      const toId = users.get(to)
      const low = Math.min(fromId, toId)
      const high = Math.max(fromId, toId)
      await tx.friendship.create({
        data: {
          requesterId: fromId,
          addresseeId: toId,
          pairLowId: low,
          pairHighId: high,
          status,
          respondedAt: status === 'ACCEPTED' ? new Date() : null,
        },
      })
    }

    await addFriendship('alice', 'bob')
    await addFriendship('bob', 'carol')
    await addFriendship('carol', 'dave')
    await addFriendship('erin', 'frank')
    await addFriendship('grace', 'henry')
    await addFriendship('isla', 'jack')
    await addFriendship('alice', 'erin', 'PENDING')

    const postIds = []
    for (const [index, [username, content, privacy]] of postSeed.entries()) {
      const post = await tx.post.create({
        data: {
          authorId: users.get(username),
          content,
          privacy,
          createdAt: new Date(Date.now() - (postSeed.length - index) * 60 * 60 * 1000),
        },
        select: { id: true },
      })
      postIds.push(post.id)
    }

    const likes = [
      ['bob', 0],
      ['carol', 0],
      ['bob', 1],
      ['alice', 3],
      ['carol', 3],
      ['dave', 4],
      ['alice', 5],
      ['bob', 5],
      ['erin', 6],
      ['frank', 8],
      ['henry', 10],
      ['grace', 11],
      ['jack', 12],
      ['isla', 13],
    ]
    await tx.like.createMany({
      data: likes.map(([username, postIndex]) => ({
        userId: users.get(username),
        postId: postIds[postIndex],
      })),
    })
  })

  console.info('Seeded 10 demo users, 14 posts, 7 friendships, and 14 likes.')
  console.info('Demo password for all accounts: retrobook-demo')
}

seed()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
