// T-63: uji performa baca (docs/07-test-plan.md bagian 5). Mengisi DB uji dengan 30 user, 200 post,
// 120 pertemanan (skala bisa dinaikkan: PERF_USERS, PERF_POSTS, PERF_FRIENDS), lalu menembak /feed dan /users/:u/posts dengan 50 permintaan paralel dan memeriksa p95.
//
//   DATABASE_URL=mysql://.../retrobook_perf API_URL=http://127.0.0.1:3030 node scripts/perf-read.mjs
//
// API harus hidup di DB yang sama dan memakai RATE_LIMIT_DISABLED=true. Skrip MENGHAPUS isi DB itu,
// jadi hanya mau jalan bila nama DB berakhiran _test atau _perf.
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const { PrismaClient } = createRequire(resolve('apps/api/package.json'))('@prisma/client')
const dbUrl = process.env.DATABASE_URL ?? ''
if (!/_(test|perf)\b/.test(dbUrl)) throw new Error('DATABASE_URL harus berakhiran _test atau _perf')
const api = process.env.API_URL ?? 'http://127.0.0.1:3030'
const THRESHOLD_MS = 300
const PARALLEL = 50
const ROUNDS = 4
const N_USERS = Number(process.env.PERF_USERS ?? 30)
const N_POSTS = Number(process.env.PERF_POSTS ?? 200)
const N_FRIENDS = Number(process.env.PERF_FRIENDS ?? 120)
const password = 'retrobook-demo'
const hash =
  '$argon2id$v=19$m=65536,t=3,p=4$qbLW7vgZD4VFM2ttdiKLeQ$jnhFgQUHsG84bxHhW+R0zthz/2/3fH4xFQdDGaCYQ+Y'

const prisma = new PrismaClient()
let rng = 42 // deterministik supaya hasil bisa dibandingkan antar-jalan
const rand = (n) => (
  (rng = (rng * 1664525 + 1013904223) % 4294967296),
  Math.floor((rng / 4294967296) * n)
)

async function reset() {
  for (const m of [
    'auditLog',
    'report',
    'notification',
    'postHashtag',
    'postTag',
    'like',
    'comment',
    'post',
    'hashtag',
    'message',
    'poke',
    'block',
    'friendship',
    'refreshToken',
    'blockedWord',
    'setting',
    'announcement',
    'user',
  ]) {
    await prisma[m].deleteMany()
  }
}

async function seed() {
  await reset()
  const users = []
  for (let i = 0; i < N_USERS; i++) {
    users.push(
      await prisma.user.create({
        data: {
          username: `perf${i}`,
          displayName: `Perf ${i}`,
          email: `perf${i}@perf.test`,
          passwordHash: hash,
        },
      }),
    )
  }
  const pairs = new Set()
  while (pairs.size < N_FRIENDS) {
    const a = rand(N_USERS),
      b = rand(N_USERS)
    if (a !== b) pairs.add(`${Math.min(a, b)}-${Math.max(a, b)}`)
  }
  for (const key of pairs) {
    const [a, b] = key.split('-').map(Number)
    await prisma.friendship.create({
      data: {
        requesterId: users[a].id,
        addresseeId: users[b].id,
        pairLowId: users[Math.min(a, b)].id,
        pairHighId: users[Math.max(a, b)].id,
        status: 'ACCEPTED',
      },
    })
  }
  const privacies = ['PUBLIC', 'FRIENDS', 'FRIENDS', 'ONLY_ME']
  const posts = []
  for (let i = 0; i < N_POSTS; i++) {
    posts.push(
      await prisma.post.create({
        data: {
          authorId: users[rand(N_USERS)].id,
          content: `Post performa ${i} #perf`,
          privacy: privacies[rand(4)],
          createdAt: new Date(Date.now() - i * 60_000),
        },
      }),
    )
  }
  for (const post of posts) {
    const likers = new Set()
    for (let k = 0; k < 2; k++) likers.add(rand(N_USERS))
    for (const l of likers)
      await prisma.like.create({ data: { userId: users[l].id, postId: post.id } })
    await prisma.comment.create({
      data: { postId: post.id, authorId: users[rand(N_USERS)].id, content: 'komentar performa' },
    })
  }
  return users
}

async function login(username) {
  const res = await fetch(`${api}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: username, password }),
  })
  if (!res.ok) throw new Error(`login ${username} gagal: ${res.status}`)
  return (await res.json()).accessToken
}

const percentile = (sorted, p) =>
  sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]

async function measure(label, path, tokens) {
  const times = []
  for (let r = 0; r < ROUNDS; r++) {
    await Promise.all(
      Array.from({ length: PARALLEL }, async (_, i) => {
        const start = performance.now()
        const res = await fetch(`${api}${path(i)}`, {
          headers: { Authorization: `Bearer ${tokens[i % tokens.length]}` },
        })
        await res.arrayBuffer()
        if (!res.ok) throw new Error(`${label}: ${res.status}`)
        times.push(performance.now() - start)
      }),
    )
  }
  times.sort((a, b) => a - b)
  const p95 = percentile(times, 95)
  console.info(
    `${label.padEnd(24)} n=${times.length} p50=${percentile(times, 50).toFixed(0)}ms p95=${p95.toFixed(0)}ms max=${times.at(-1).toFixed(0)}ms ${p95 < THRESHOLD_MS ? 'OK' : 'LEWAT AMBANG'}`,
  )
  return p95
}

/** Paginasi: feed 10 per halaman sampai habis, tanpa id ganda. */
async function paginationCheck(token) {
  const seen = new Set()
  let cursor = null
  for (let page = 0; page < 100; page++) {
    const res = await fetch(`${api}/api/feed?limit=10${cursor ? `&cursor=${cursor}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await res.json()
    for (const item of body.items) {
      if (seen.has(item.id)) throw new Error(`id ganda di feed: ${item.id}`)
      seen.add(item.id)
    }
    if (!body.nextCursor) break
    cursor = body.nextCursor
  }
  console.info(`paginasi feed: ${seen.size} post, 0 duplikat`)
}

try {
  const users = await seed()
  const tokens = []
  for (const u of users.slice(0, 5)) tokens.push(await login(u.username))
  await paginationCheck(tokens[0])
  const worst = Math.max(
    await measure('GET /feed?limit=10', () => '/api/feed?limit=10', tokens),
    await measure(
      'GET /users/:u/posts',
      (i) => `/api/users/perf${i % N_USERS}/posts?limit=10`,
      tokens,
    ),
    // T-88: endpoint pasca-R4 dan sort=top (agregat like, batas yang diketahui sejak T-63).
    await measure('GET /feed?sort=top', () => '/api/feed?limit=10&sort=top', tokens),
    await measure('GET /search/posts', () => '/api/search/posts?q=performa&limit=10', tokens),
    await measure('GET /saved', () => '/api/saved?limit=10', tokens),
    await measure('GET /on-this-day', () => '/api/on-this-day', tokens),
    await measure('GET /year-in-review', () => '/api/year-in-review', tokens),
  )
  if (worst >= THRESHOLD_MS) process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
