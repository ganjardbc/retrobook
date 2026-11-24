// Tes integrasi pencarian orang (T-39, SRC-01, BR-05, BR-11).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
if (!/_test\b/.test(process.env.DATABASE_URL)) {
  throw new Error('TEST_DATABASE_URL harus menunjuk ke database berakhiran _test')
}
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import type { User } from '@prisma/client'
import request from 'supertest'
import { AppModule } from '../../app.module'
import { configureApp } from '../../common/configure-app'
import { resetDb } from '../../test/db'
import { testHelpers } from '../../test/helpers'

describe('Pencarian orang (integrasi)', () => {
  let app: INestApplication
  let h: ReturnType<typeof testHelpers>

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = mod.createNestApplication()
    configureApp(app)
    await app.init()
    h = testHelpers(app)
  })
  beforeEach(() => resetDb(h.prisma))
  afterAll(async () => {
    await resetDb(h.prisma)
    await app.close()
  })

  const mk = (displayName: string, username: string, extra: Partial<User> = {}) =>
    h.prisma.user.create({
      data: {
        email: `${username}@example.com`,
        username,
        displayName,
        passwordHash: 'x',
        ...extra,
      },
    })
  const search = async (viewer: User, qs: string) => h.as(viewer).get(`/search${qs}`)
  const names = (res: { body: { items: { displayName: string }[] } }) =>
    res.body.items.map((i) => i.displayName)

  it('tanpa token: 401', async () => {
    expect((await request(app.getHttpServer()).get('/api/search?q=bud')).status).toBe(401)
  })

  it('cocok pada nama atau username, tanpa membedakan huruf besar kecil, urut abjad', async () => {
    const me = await mk('Me', 'me')
    await mk('Budi Santoso', 'budis')
    await mk('Sari', 'sari_budi')
    await mk('Andi', 'andi')
    await mk('Ibu BUDIarti', 'ibu')
    const res = await search(me, '?q=bud')
    expect(res.status).toBe(200)
    expect(names(res)).toEqual(['Budi Santoso', 'Ibu BUDIarti', 'Sari'])
    expect(res.body.items[0]).toEqual({
      id: expect.any(Number),
      username: 'budis',
      displayName: 'Budi Santoso',
      avatarUrl: null,
      isBot: false,
    })
  })

  it('memangkas spasi di sekitar kata kunci', async () => {
    const me = await mk('Me', 'me')
    await mk('Budi', 'budi')
    expect(names(await search(me, '?q=%20%20bud%20'))).toEqual(['Budi'])
  })

  it.each([
    ['kosong', '?q='],
    ['tanpa q', ''],
    ['satu karakter', '?q=a'],
    ['hanya spasi', '?q=%20%20%20'],
    ['terlalu panjang', `?q=${'x'.repeat(81)}`],
    ['limit nol', '?q=bud&limit=0'],
    ['limit terlalu besar', '?q=bud&limit=51'],
    ['cursor bukan angka', '?q=bud&cursor=x'],
  ])('%s: 400', async (_n, qs) => {
    const me = await mk('Me', 'me')
    expect((await search(me, qs)).status).toBe(400)
  })

  it('% dan _ dicocokkan apa adanya, bukan wildcard', async () => {
    const me = await mk('Me', 'me')
    await mk('Budi', 'budi')
    await mk('100% Budi', 'seratus')
    await mk('a_b', 'under')
    await mk('axb', 'axb')
    expect(names(await search(me, '?q=0%25'))).toEqual(['100% Budi'])
    expect(names(await search(me, '?q=a_'))).toEqual(['a_b'])
  })

  it('maksimal 8 hasil secara bawaan, nextCursor untuk halaman berikutnya', async () => {
    const me = await mk('Me', 'me')
    for (let i = 0; i < 12; i++) await mk(`Budi ${String(i).padStart(2, '0')}`, `budi${i}`)
    const p1 = (await search(me, '?q=budi')).body
    expect(p1.items).toHaveLength(8)
    expect(p1.nextCursor).not.toBeNull()
    const p2 = (await search(me, `?q=budi&cursor=${p1.nextCursor}`)).body
    expect(p2.items).toHaveLength(4)
    expect(p2.nextCursor).toBeNull()
    const all = [...p1.items, ...p2.items].map((i: { displayName: string }) => i.displayName)
    expect(all).toEqual([...all].sort())
    expect(new Set(all).size).toBe(12)
    expect((await search(me, '?q=budi&limit=3')).body.items).toHaveLength(3)
  })

  describe('visibilitas (BR-05, BR-11)', () => {
    it.each([
      [
        'BANNED',
        (u: User) => h.prisma.user.update({ where: { id: u.id }, data: { status: 'BANNED' } }),
      ],
      [
        'terhapus',
        (u: User) => h.prisma.user.update({ where: { id: u.id }, data: { deletedAt: new Date() } }),
      ],
    ])('akun %s tidak muncul', async (_n, change) => {
      const me = await mk('Me', 'me')
      const target = await mk('Budi', 'budi')
      expect(names(await search(me, '?q=budi'))).toEqual(['Budi'])
      await change(target)
      expect(names(await search(me, '?q=budi'))).toEqual([])
    })

    it('blokir dua arah: pemblokir dan yang diblokir tidak saling menemukan; orang lain masih', async () => {
      const dave = await mk('Dave', 'dave')
      const alice = await mk('Alice Budi', 'alice')
      const other = await mk('Other', 'other')
      await h.prisma.block.create({ data: { blockerId: dave.id, blockedId: alice.id } })
      expect(names(await search(dave, '?q=alice'))).toEqual([]) // pemblokir tidak menemukan yang diblokir
      expect(names(await search(alice, '?q=dave'))).toEqual([]) // dan sebaliknya
      expect(names(await search(other, '?q=alice'))).toEqual(['Alice Budi'])
      expect(names(await search(other, '?q=dave'))).toEqual(['Dave'])
    })

    it('SUSPENDED tetap ditemukan seperti di tempat lain (profil tetap ada)', async () => {
      const me = await mk('Me', 'me')
      await mk('Budi', 'budi', { status: 'SUSPENDED' })
      expect(names(await search(me, '?q=budi'))).toEqual(['Budi'])
    })

    it('tidak membocorkan data sensitif: hanya field ringkasan', async () => {
      const me = await mk('Me', 'me')
      await mk('Budi', 'budi')
      const item = (await search(me, '?q=budi')).body.items[0]
      expect(Object.keys(item).sort()).toEqual([
        'avatarUrl',
        'displayName',
        'id',
        'isBot',
        'username',
      ])
    })
  })
})
