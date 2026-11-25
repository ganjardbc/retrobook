// Seed demo (T-65, ERD bagian 8): 30 user + 1 admin, ~120 pertemanan, 200 post, ~600 komentar,
// ~1.000 like, ~300 pesan, 10 laporan, 2 pengaturan, 10 kata terlarang. Deterministik (RNG bersemi tetap).
// Aman dijalankan ulang: bila data demo sudah lengkap, tidak ada yang berubah. `SEED_RESET=true` menghapus
// SEMUA data lalu mengisi ulang (hanya di non-produksi; untuk demo).
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const demoPasswordHash =
  '$argon2id$v=19$m=65536,t=3,p=4$qbLW7vgZD4VFM2ttdiKLeQ$jnhFgQUHsG84bxHhW+R0zthz/2/3fH4xFQdDGaCYQ+Y'

const people = [
  ['alice', 'Alice Chen'], ['bob', 'Bob Miller'], ['carol', 'Carol Rivera'], ['dave', 'Dave Williams'],
  ['erin', 'Erin Walker'], ['frank', 'Frank Moore'], ['grace', 'Grace Lee'], ['henry', 'Henry Adams'],
  ['isla', 'Isla Martin'], ['jack', 'Jack Thompson'], ['kate', 'Kate Bennett'], ['liam', 'Liam Foster'],
  ['maya', 'Maya Patel'], ['noah', 'Noah Kim'], ['olivia', 'Olivia Brooks'], ['peter', 'Peter Novak'],
  ['quinn', 'Quinn Harper'], ['ruth', 'Ruth Santos'], ['sam', 'Sam Okafor'], ['tina', 'Tina Rossi'],
  ['uma', 'Uma Reyes'], ['victor', 'Victor Hale'], ['wendy', 'Wendy Cho'], ['xavier', 'Xavier Dunn'],
  ['yara', 'Yara Haddad'], ['zane', 'Zane Mercer'], ['ada', 'Ada Lovell'], ['ben', 'Ben Carter'],
  ['cleo', 'Cleo Vance'], ['dino', 'Dino Fiore'],
].map(([username, displayName]) => ({ username, displayName, email: `${username}@retrobook.demo` }))
const admin = { username: 'admin', displayName: 'Site Admin', email: 'admin@retrobook.demo', role: 'ADMIN' }

// 14 post tulisan tangan di depan supaya demo lama (alice, bob, ...) tetap sama.
const handwritten = [
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
const templates = [
  'Coffee first, then the world. #coffee', 'Throwback to the summer of 2014! #throwback', 'Anyone else watching the game tonight? #weekend',
  'New haircut, who dis?', 'Just finished a great workout. #fitness', 'Rainy day, perfect for staying in. #cozy',
  'Road trip playlist suggestions? #music', 'Made it to Friday! #fridayfeeling', 'Sunset from the balcony tonight. #sunset',
  'Trying to learn guitar, wish me luck. #music', 'Lunch with old friends today. #throwback', 'Cannot believe it is already March.',
  'Movie night recommendations please! #weekend', 'Sunday brunch done right. #coffee', 'Finally cleaned the whole apartment.',
  'Good morning everyone, have a great day!', 'Just adopted a puppy! #newfriend', 'Concert tickets secured. #music',
]
const comments = ['Love this!', 'Haha so true.', 'Wish I was there!', 'Nice one :)', 'Count me in.', 'Great photo!', 'Same here!', 'Let us catch up soon.', 'Awesome.', 'Totally agree.']
const chat = ['Hey, how are you?', 'Did you see the news?', 'Lunch tomorrow?', 'Thanks for the help!', 'Haha that was funny.', 'Call me later.', 'On my way.', 'See you at 7.', 'Great, talk soon.', 'Happy birthday!']
const blockedWords = ['spamlink', 'freemoney', 'clickhere', 'buyfollowers', 'casino', 'lottery', 'adultcontent', 'scamoffer', 'fakepills', 'cheapmeds']

let rng = 20150301
const rand = (n) => ((rng = (rng * 1664525 + 1013904223) % 4294967296), Math.floor((rng / 4294967296) * n))
const pick = (list) => list[rand(list.length)]
const daysAgo = (d, extraMinutes = 0) => new Date(Date.now() - d * 86_400_000 + extraMinutes * 60_000)

async function reset() {
  for (const model of [
    'auditLog', 'report', 'notification', 'announcement', 'postHashtag', 'postTag', 'like', 'comment', 'post',
    'hashtag', 'message', 'poke', 'block', 'friendship', 'refreshToken', 'blockedWord', 'setting', 'user',
  ]) {
    await prisma[model].deleteMany()
  }
}

async function seed() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production.')
  if (process.env.SEED_RESET === 'true') {
    await reset()
    console.info('SEED_RESET: all existing data removed.')
  }

  const all = [...people, admin]
  const existing = await prisma.user.count({ where: { username: { in: all.map((p) => p.username) } } })
  if (existing > 0) {
    if (existing !== all.length) {
      throw new Error('Partial demo accounts already exist; refusing to add duplicate seed data (use SEED_RESET=true).')
    }
    console.info('Demo data already exists; nothing changed.')
    return
  }

  const summary = await prisma.$transaction(
    async (tx) => {
      const ids = new Map()
      for (const person of all) {
        const user = await tx.user.create({ data: { ...person, passwordHash: demoPasswordHash }, select: { id: true } })
        ids.set(person.username, user.id)
      }
      const names = people.map((p) => p.username)
      const adminId = ids.get('admin')

      // Pertemanan: pasangan tulisan tangan dulu, lalu acak sampai 120 (satu baris per pasangan, BR-01).
      const pairs = new Map()
      const addPair = (a, b, status) => {
        const key = [ids.get(a), ids.get(b)].sort((x, y) => x - y).join('-')
        if (a !== b && !pairs.has(key)) pairs.set(key, { a, b, status })
      }
      for (const [a, b] of [['alice', 'bob'], ['bob', 'carol'], ['carol', 'dave'], ['erin', 'frank'], ['grace', 'henry'], ['isla', 'jack']]) addPair(a, b, 'ACCEPTED')
      addPair('alice', 'erin', 'PENDING')
      while (pairs.size < 120) addPair(pick(names), pick(names), pairs.size < 100 ? 'ACCEPTED' : 'PENDING')
      await tx.friendship.createMany({
        data: [...pairs.values()].map(({ a, b, status }) => ({
          requesterId: ids.get(a), addresseeId: ids.get(b),
          pairLowId: Math.min(ids.get(a), ids.get(b)), pairHighId: Math.max(ids.get(a), ids.get(b)),
          status, respondedAt: status === 'ACCEPTED' ? daysAgo(rand(60)) : null,
        })),
      })

      // Post: 200 dengan waktu tersebar 60 hari; hashtag diambil dari teks.
      const specs = handwritten.map(([u, content, privacy]) => ({ u, content, privacy }))
      while (specs.length < 200) specs.push({ u: pick(names), content: pick(templates), privacy: pick(['PUBLIC', 'PUBLIC', 'FRIENDS', 'FRIENDS', 'FRIENDS', 'ONLY_ME']) })
      const posts = []
      for (const [i, spec] of specs.entries()) {
        const post = await tx.post.create({
          data: { authorId: ids.get(spec.u), content: spec.content, privacy: spec.privacy, createdAt: daysAgo((60 * (specs.length - i)) / specs.length, rand(600)) },
          select: { id: true, content: true, authorId: true },
        })
        posts.push(post)
      }
      const tagNames = [...new Set(posts.flatMap((p) => [...p.content.matchAll(/#(\w+)/g)].map((m) => m[1].toLowerCase())))]
      await tx.hashtag.createMany({ data: tagNames.map((tag) => ({ tag })) })
      const tagIds = new Map((await tx.hashtag.findMany()).map((h) => [h.tag, h.id]))
      await tx.postHashtag.createMany({
        data: posts.flatMap((p) => [...new Set([...p.content.matchAll(/#(\w+)/g)].map((m) => m[1].toLowerCase()))].map((t) => ({ postId: p.id, hashtagId: tagIds.get(t) }))),
      })

      // Like (~1.000, unik per user-post) dan komentar (~600).
      const likeKeys = new Set()
      while (likeKeys.size < 1000) likeKeys.add(`${rand(30)}-${rand(posts.length)}`)
      await tx.like.createMany({ data: [...likeKeys].map((k) => { const [u, p] = k.split('-').map(Number); return { userId: ids.get(names[u]), postId: posts[p].id } }) })
      await tx.comment.createMany({
        data: Array.from({ length: 600 }, () => { const p = pick(posts); return { postId: p.id, authorId: ids.get(pick(names)), content: pick(comments), createdAt: daysAgo(rand(30), rand(600)) } }),
      })

      // Pesan (~300) antar teman ACCEPTED; sebagian percakapan menyisakan pesan belum dibaca.
      const friends = [...pairs.values()].filter((p) => p.status === 'ACCEPTED')
      const messages = []
      for (let i = 0; i < 300; i++) {
        const { a, b } = pick(friends.slice(0, 40))
        const [from, to] = rand(2) ? [a, b] : [b, a]
        messages.push({ senderId: ids.get(from), receiverId: ids.get(to), content: pick(chat), createdAt: daysAgo(14 - i / 25, i), readAt: i < 270 ? daysAgo(14 - i / 25, i + 5) : null })
      }
      await tx.message.createMany({ data: messages })

      // Laporan (10): campuran status supaya antrean admin terisi.
      const reportData = []
      const used = new Set()
      while (reportData.length < 10) {
        const post = pick(posts)
        const reporter = ids.get(pick(names))
        const key = `${reporter}-${post.id}`
        if (reporter === post.authorId || used.has(key)) continue
        used.add(key)
        const status = reportData.length < 6 ? 'PENDING' : reportData.length < 8 ? 'REVIEWED' : 'DISMISSED'
        reportData.push({
          reporterId: reporter, targetType: 'POST', targetId: post.id, reason: pick(['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'OTHER']),
          note: reportData.length % 2 ? 'Looks suspicious.' : null, status,
          handledBy: status === 'PENDING' ? null : adminId, handledAt: status === 'PENDING' ? null : daysAgo(1),
        })
      }
      await tx.report.createMany({ data: reportData })

      await tx.setting.createMany({
        data: [{ key: 'maintenance_mode', value: false }, { key: 'registration_open', value: true }],
      })
      await tx.blockedWord.createMany({ data: blockedWords.map((word) => ({ word, createdBy: adminId })) })

      return { users: all.length, friendships: pairs.size, posts: posts.length, likes: likeKeys.size, messages: messages.length }
    },
    { timeout: 120_000, maxWait: 10_000 },
  )

  console.info(`Seeded ${summary.users} users (incl. admin), ${summary.friendships} friendships, ${summary.posts} posts, ~600 comments, ${summary.likes} likes, ${summary.messages} messages, 10 reports, 2 settings, ${blockedWords.length} blocked words.`)
  console.info('Demo password for all accounts: retrobook-demo (admin login: admin / retrobook-demo)')
}

seed()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
