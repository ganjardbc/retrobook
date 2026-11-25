import { extractHashtags, splitHashtags, type Post } from '@retrobook/shared'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import HashtagText from '@/modules/posts/components/HashtagText.vue'
import TrendingCard from '@/modules/search/components/TrendingCard.vue'
import HashtagView from '@/modules/search/pages/HashtagView.vue'
import { searchApi } from '@/modules/search/services/api'

vi.mock('@/modules/search/services/api', async (orig) => ({
  ...(await orig<typeof import('@/modules/search/services/api')>()),
  searchApi: { people: vi.fn(), trending: vi.fn(), hashtagPosts: vi.fn() },
}))
const api = vi.mocked(searchApi)

const makeRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/hashtag/:tag', name: 'hashtag', component: HashtagView },
      { path: '/', name: 'home', component: { template: '<p>home</p>' } },
    ],
  })

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
})

describe('splitHashtags / extractHashtags', () => {
  it('mengenali #tag huruf kecil unik, melewatkan "a#b", "&#39;", dan kata lebih dari 50 karakter', () => {
    expect(extractHashtags(`Hi #Retro #retro a#nope &#39; #${'x'.repeat(51)} # #ok.`)).toEqual([
      'retro',
      'ok',
    ])
  })

  it('maksimal 10 hashtag; sisanya teks biasa', () => {
    const text = Array.from({ length: 12 }, (_, i) => `#t${i}`).join(' ')
    expect(extractHashtags(text)).toHaveLength(10)
    expect(splitHashtags(text).filter((p) => p.tag)).toHaveLength(10)
  })

  it('potongan digabung kembali sama dengan teks asli', () => {
    const text = 'a #b, c\n#d_e #é!'
    expect(
      splitHashtags(text)
        .map((p) => p.text)
        .join(''),
    ).toBe(text)
  })
})

describe('HashtagText', () => {
  it('menautkan #tag ke halaman hashtag dan tidak menafsirkan HTML', async () => {
    const router = makeRouter()
    const w = mount(
      {
        components: { HashtagText },
        template: '<p><HashtagText :text="text" /></p>',
        data: () => ({ text: '<b>x</b> #Retro dan #90an' }),
      },
      { global: { plugins: [router] } },
    )
    expect(w.find('b').exists()).toBe(false)
    expect(w.find('p').element.textContent).toBe('<b>x</b> #Retro dan #90an')
    const links = w.findAll('a')
    expect(links.map((a) => a.attributes('href'))).toEqual(['/hashtag/retro', '/hashtag/90an'])
  })
})

describe('TrendingCard', () => {
  it('menampilkan hashtag dan jumlah; tersembunyi bila kosong atau gagal', async () => {
    const router = makeRouter()
    api.trending.mockResolvedValueOnce({ items: [{ tag: 'retro', count: 3 }] })
    const w = mount(TrendingCard, { global: { plugins: [router] } })
    await flushPromises()
    expect(w.text()).toContain('#retro')
    expect(w.text()).toContain('3 posts')
    expect(w.find('a').attributes('href')).toBe('/hashtag/retro')

    api.trending.mockRejectedValueOnce(new Error('x'))
    const failed = mount(TrendingCard, { global: { plugins: [router] } })
    await flushPromises()
    expect(failed.find('section').exists()).toBe(false)
  })
})

describe('HashtagView', () => {
  const post = (id: string): Post =>
    ({
      id,
      author: { id: '1', username: 'a', displayName: 'A', avatarUrl: null, isBot: false },
      wallOwner: null,
      sharedFrom: null,
      content: `isi #retro ${id}`,
      imageUrl: null,
      feeling: null,
      privacy: 'PUBLIC',
      tags: [],
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
      savedByMe: false,
      likedPreview: [],
      editedAt: null,
      createdAt: new Date().toISOString(),
    }) as Post

  const open = async (tag: string) => {
    const router = makeRouter()
    await router.push(`/hashtag/${tag}`)
    const w = mount(HashtagView, { global: { plugins: [router] } })
    await flushPromises()
    return { w, router }
  }

  it('memuat post untuk tag di URL (huruf kecil) dan menampilkan judulnya', async () => {
    api.hashtagPosts.mockResolvedValue({ items: [post('1'), post('2')], nextCursor: null })
    const { w } = await open('Retro')
    expect(api.hashtagPosts).toHaveBeenCalledWith('retro', null)
    expect(w.find('h1').text()).toBe('Posts tagged #retro')
    expect(w.text()).toContain('isi #retro 1')
    expect(w.text()).toContain('isi #retro 2')
  })

  it('tanpa hasil: pesan kosong; pindah tag memuat ulang', async () => {
    api.hashtagPosts.mockResolvedValue({ items: [], nextCursor: null })
    const { w, router } = await open('sepi')
    expect(w.text()).toContain('No public posts with this hashtag yet.')
    api.hashtagPosts.mockResolvedValue({ items: [post('9')], nextCursor: null })
    await router.push('/hashtag/ramai')
    await flushPromises()
    expect(api.hashtagPosts).toHaveBeenLastCalledWith('ramai', null)
    expect(w.text()).toContain('isi #retro 9')
    expect(w.text()).not.toContain('No public posts')
  })
})
