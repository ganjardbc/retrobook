import type { Post, UserSummary } from '@retrobook/shared'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import StatusBox from '@/modules/feed/components/StatusBox.vue'
import { friendsApi } from '@/modules/friends/services/api'
import { useAuthStore } from '@/modules/auth/stores'
import PostCard from '@/modules/posts/components/PostCard.vue'
import { postsApi } from '@/modules/posts/services/api'

const router = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:p(.*)*', component: { template: '<p/>' } }],
  })
const user = (id: number, name: string): UserSummary => ({
  id,
  username: name.toLowerCase(),
  displayName: name,
  avatarUrl: null,
  isBot: false,
})
const mkPost = (over: Partial<Post> = {}): Post => ({
  id: 1,
  author: user(1, 'Alice'),
  wallOwner: null,
  sharedFrom: null,
  content: 'halo',
  imageUrl: null,
  feeling: null,
  privacy: 'FRIENDS',
  tags: [],
  likeCount: 0,
  commentCount: 0,
  likedByMe: false,
  savedByMe: false,
  likedPreview: [],
  editedAt: null,
  createdAt: new Date().toISOString(),
  ...over,
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.restoreAllMocks()
})

describe('PostCard: wall post dan tag', () => {
  const mountCard = (post: Post, me: UserSummary) => {
    useAuthStore().user = { id: me.id, username: me.username, displayName: me.displayName }
    return mount(PostCard, { props: { post }, global: { plugins: [router()] } })
  }
  const names = (w: ReturnType<typeof mountCard>) => w.findAll('.post__who a').map((a) => a.text())

  it('post biasa: hanya nama penulis', () => {
    const w = mountCard(mkPost(), user(9, 'Zed'))
    expect(names(w)).toEqual(['Alice'])
    expect(w.find('.post__arrow').exists()).toBe(false)
  })

  it('wall post: "Alice ▸ Bob" dengan tautan ke dua profil', () => {
    const w = mountCard(mkPost({ wallOwner: user(2, 'Bob') }), user(9, 'Zed'))
    expect(names(w)).toEqual(['Alice', 'Bob'])
    expect(w.find('.post__arrow').text()).toBe('▸')
    expect(w.findAll('.post__who a')[1]!.attributes('href')).toBe('/bob')
  })

  it.each([
    [[user(3, 'Carol')], '— with Carol'],
    [[user(3, 'Carol'), user(4, 'Dave')], '— with Carol and Dave'],
    [[user(3, 'Carol'), user(4, 'Dave'), user(5, 'Erin')], '— with Carol, Dave and 1 other'],
    [
      [user(3, 'Carol'), user(4, 'Dave'), user(5, 'Erin'), user(6, 'Finn')],
      '— with Carol, Dave and 2 others',
    ],
  ])('tag %#: %s', (tags, text) => {
    const w = mountCard(mkPost({ tags }), user(9, 'Zed'))
    expect(w.find('.post__with').text().replace(/\s+/g, ' ')).toBe(text)
    expect(w.find('.post__with').html()).toContain(' — with ') // spasi sebelum tanda pisah
  })

  it('menu: penulis mengedit dan menghapus; pemilik dinding menghapus dan melaporkan; lainnya hanya melaporkan', async () => {
    const post = mkPost({ wallOwner: user(2, 'Bob') })
    const author = mountCard(post, user(1, 'Alice'))
    await author.find('.post__dots').trigger('click')
    expect(author.findAll('.post__item').map((b) => b.text())).toEqual(['Edit', 'Delete'])

    const owner = mountCard(post, user(2, 'Bob'))
    await owner.find('.post__dots').trigger('click')
    expect(owner.findAll('.post__item').map((b) => b.text())).toEqual(['Delete', 'Report'])

    const other = mountCard(post, user(3, 'Carol'))
    await other.find('.post__dots').trigger('click')
    expect(other.findAll('.post__item').map((b) => b.text())).toEqual(['Report'])
  })

  it('edit wall post tidak menampilkan pilihan privasi', async () => {
    const w = mountCard(mkPost({ wallOwner: user(2, 'Bob') }), user(1, 'Alice'))
    await w.find('.post__dots').trigger('click')
    await w.find('.post__item').trigger('click')
    expect(w.find('.post__editor').exists()).toBe(true)
    expect(w.findAll('.post__editor select')).toHaveLength(1) // hanya perasaan, tanpa privasi
  })
})

describe('StatusBox: dinding dan tag', () => {
  it('di dinding teman: placeholder dengan nama, tanpa privasi, mengirim wallOwnerUsername', async () => {
    const create = vi.spyOn(postsApi, 'create').mockResolvedValue(mkPost({ id: 5 }))
    const w = mount(StatusBox, { props: { wallOwner: { username: 'bob', displayName: 'Bob' } } })
    expect(w.find('textarea').attributes('placeholder')).toBe('Write something to Bob...')
    expect(w.findAll('select')).toHaveLength(1) // hanya perasaan, tanpa privasi
    await w.find('textarea').setValue('hai')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'hai', wallOwnerUsername: 'bob' }),
    )
  })

  it('di grup: placeholder grup, tanpa privasi, mengirim groupId, tidak masuk feed utama, @ tidak men-tag', async () => {
    const create = vi.spyOn(postsApi, 'create').mockResolvedValue(mkPost({ id: 6 }))
    const w = mount(StatusBox, { props: { groupId: 9 } })
    expect(w.find('textarea').attributes('placeholder')).toBe('Write something to the group...')
    expect(w.findAll('select')).toHaveLength(1) // hanya perasaan
    await w.find('textarea').setValue('@bo')
    expect(w.findComponent({ name: 'TagSuggestions' }).exists()).toBe(false)
    await w.find('textarea').setValue('halo grup')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'halo grup', groupId: 9, privacy: 'FRIENDS' }),
    )
    expect(w.emitted('posted')).toHaveLength(1)
  })

  describe('tag dengan @', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    const typeMention = async (w: ReturnType<typeof mount>, text: string) => {
      await w.find('textarea').setValue(text)
      await vi.advanceTimersByTimeAsync(250)
      await flushPromises()
    }
    const mountBox = () => mount(StatusBox, { attachTo: document.body })
    const friends = (...us: UserSummary[]) =>
      vi
        .spyOn(friendsApi, 'list')
        .mockResolvedValue({ items: us, nextCursor: null, total: us.length })

    it('mengetik @bo mencari teman, memilih membuat chip dan menghapus "@bo" dari teks', async () => {
      const list = friends(user(2, 'Bob'))
      const w = mountBox()
      await typeMention(w, 'halo @bo')
      expect(list).toHaveBeenCalledWith(null, 'bo')
      expect(w.find('[role="option"] span:last-child').text()).toBe('Bob')

      await w.find('[role="option"]').trigger('mousedown')
      expect((w.find('textarea').element as HTMLTextAreaElement).value).toBe('halo ')
      expect(w.find('.status__chip').text()).toContain('Bob')
      expect(w.find('[role="listbox"]').exists()).toBe(false)
      w.unmount()
    })

    it('kirim menyertakan taggedUserIds; chip bisa dihapus', async () => {
      friends(user(2, 'Bob'), user(3, 'Carol'))
      const create = vi.spyOn(postsApi, 'create').mockResolvedValue(mkPost({ id: 7 }))
      const w = mountBox()
      await typeMention(w, '@')
      await w.findAll('[role="option"]')[0]!.trigger('mousedown')
      await typeMention(w, '@')
      // Bob sudah ter-tag: tidak muncul lagi dalam saran (disaring di klien)
      await w.findAll('[role="option"]')[0]!.trigger('mousedown')
      expect(w.findAll('.status__chip')).toHaveLength(2)
      await w.find('.status__chip button').trigger('click')
      expect(w.findAll('.status__chip')).toHaveLength(1)

      await w.find('textarea').setValue('isi')
      await w.find('form').trigger('submit')
      await flushPromises()
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'isi', taggedUserIds: [3] }),
      )
      expect(w.find('.status__chip').exists()).toBe(false) // dibersihkan setelah terkirim
      w.unmount()
    })

    it('keyboard: panah memilih, Enter menandai, Escape menutup', async () => {
      friends(user(2, 'Bob'), user(3, 'Carol'))
      const w = mountBox()
      await typeMention(w, '@')
      const ta = w.find('textarea')
      await ta.trigger('keydown', { key: 'ArrowDown' })
      expect(w.findAll('[role="option"]')[1]!.attributes('aria-selected')).toBe('true')
      await ta.trigger('keydown', { key: 'Enter' })
      expect(w.find('.status__chip').text()).toContain('Carol')

      await typeMention(w, '@')
      await ta.trigger('keydown', { key: 'Escape' })
      expect(w.find('[role="listbox"]').exists()).toBe(false)
      w.unmount()
    })

    it('"@" di tengah kata (email) tidak membuka saran; tanpa hasil: pesan kosong', async () => {
      const list = friends()
      const w = mountBox()
      await typeMention(w, 'a@b')
      expect(w.find('[role="listbox"]').exists()).toBe(false)
      expect(list).not.toHaveBeenCalled()
      await typeMention(w, 'a @zz')
      expect(w.text()).toContain('No matching friends.')
      w.unmount()
    })

    it('maksimal 10 tag: yang ke-11 diabaikan', async () => {
      friends(...Array.from({ length: 12 }, (_, i) => user(i + 2, `U${i}`)))
      const w = mountBox()
      for (let i = 0; i < 11; i++) {
        await typeMention(w, '@')
        await w.findAll('[role="option"]')[0]!.trigger('mousedown')
      }
      expect(w.findAll('.status__chip')).toHaveLength(10)
      w.unmount()
    })
  })
})
