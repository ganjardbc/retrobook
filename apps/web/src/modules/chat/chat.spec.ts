import type { ChatFriend, ChatMessage, Conversation, UserSummary } from '@retrobook/shared'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChatDock from '@/modules/chat/components/ChatDock.vue'
import ChatSidebar from '@/modules/chat/components/ChatSidebar.vue'
import MessagesJewel from '@/modules/chat/components/MessagesJewel.vue'
import { chatApi } from '@/modules/chat/services/api'
import { MAX_WINDOWS, useChatStore } from '@/modules/chat/stores'
import { useAuthStore } from '@/modules/auth/stores'

type Handler = (...a: never[]) => void
const sock = vi.hoisted(() => {
  const handlers = new Map<string, Set<(...a: unknown[]) => void>>()
  const emitWithAck = vi.fn()
  const emit = vi.fn()
  const socket = {
    emit,
    connected: true,
    on: (e: string, h: (...a: unknown[]) => void) =>
      handlers.set(e, (handlers.get(e) ?? new Set()).add(h)),
    off: (e: string, h: (...a: unknown[]) => void) => handlers.get(e)?.delete(h),
    timeout: vi.fn(() => ({ emitWithAck })),
  }
  const fire = (e: string, ...a: unknown[]) => handlers.get(e)?.forEach((h) => h(...a))
  return { handlers, emitWithAck, emit, socket, fire }
})
vi.mock('@/plugins/realtime', () => ({ getSocket: () => sock.socket, disconnectRealtime: vi.fn() }))
vi.mock('@/modules/chat/services/api', () => ({
  chatApi: {
    friends: vi.fn(),
    conversations: vi.fn(),
    history: vi.fn(),
    send: vi.fn(),
    read: vi.fn(),
  },
}))
const api = vi.mocked(chatApi)
void (null as unknown as Handler)

const user = (id: number, name: string): UserSummary => ({
  id,
  username: name.toLowerCase(),
  displayName: name,
  avatarUrl: null,
  isBot: false,
})
const friend = (id: number, name: string, over: Partial<ChatFriend> = {}): ChatFriend => ({
  user: user(id, name),
  online: false,
  client: null,
  unreadCount: 0,
  ...over,
})
const msg = (id: number, from: number, to: number, content = `m${id}`): ChatMessage => ({
  id,
  senderId: from,
  receiverId: to,
  content,
  readAt: null,
  createdAt: new Date().toISOString(),
})
const ME = 1

beforeEach(() => {
  setActivePinia(createPinia())
  vi.resetAllMocks()
  sock.handlers.clear()
  sock.socket.connected = true
  sock.socket.timeout.mockImplementation(() => ({ emitWithAck: sock.emitWithAck }))
  useAuthStore().user = { id: ME, username: 'me', displayName: 'Me' }
  api.friends.mockResolvedValue({
    items: [
      friend(2, 'Bob', { online: true, client: 'WEB' }),
      friend(3, 'Carol', { online: true, client: 'MOBILE', unreadCount: 2 }),
      friend(4, 'Dave'),
      friend(5, 'Erin'),
    ],
  })
  api.history.mockResolvedValue({ items: [msg(12, 2, ME), msg(11, ME, 2)], nextCursor: null })
  api.read.mockResolvedValue({ updated: 1 })
  api.conversations.mockResolvedValue({ items: [], nextCursor: null })
})

const started = async () => {
  const chat = useChatStore()
  chat.start()
  await flushPromises()
  return chat
}

describe('chat store: jendela dan riwayat', () => {
  it('start memuat teman dan mendengarkan event; stop membersihkan', async () => {
    const chat = await started()
    expect(chat.friends).toHaveLength(4)
    expect(chat.totalUnread).toBe(2)
    expect(sock.handlers.get('message:new')?.size).toBe(1)
    chat.stop()
    expect(sock.handlers.get('message:new')?.size).toBe(0)
    expect(chat.friends).toEqual([])
  })

  it('start dua kali tidak menggandakan listener', async () => {
    const chat = await started()
    chat.start()
    expect(sock.handlers.get('presence')?.size).toBe(1)
  })

  it('openWindow memuat riwayat urut lama ke baru; membuka lagi memperbaiki minimize', async () => {
    const chat = await started()
    chat.openWindow(user(2, 'Bob'))
    await flushPromises()
    expect(chat.thread(2).messages.map((m) => m.id)).toEqual([11, 12])
    chat.toggleMinimize(2)
    expect(chat.windows[0]!.minimized).toBe(true)
    chat.openWindow(user(2, 'Bob'))
    expect(chat.windows).toHaveLength(1)
    expect(chat.windows[0]!.minimized).toBe(false)
    expect(api.history).toHaveBeenCalledTimes(1) // riwayat tidak dimuat ulang
  })

  it(`maksimal ${MAX_WINDOWS} jendela: yang tertua ditutup`, async () => {
    const chat = await started()
    for (const [id, n] of [
      [2, 'Bob'],
      [3, 'Carol'],
      [4, 'Dave'],
      [5, 'Erin'],
    ] as const)
      chat.openWindow(user(id, n))
    expect(chat.windows.map((w) => w.user.id)).toEqual([3, 4, 5])
  })

  it('membuka jendela atau mengembangkan yang diciutkan menandai terbaca bila ada belum dibaca', async () => {
    const chat = await started()
    chat.openWindow(user(3, 'Carol'))
    await flushPromises()
    expect(api.read).toHaveBeenCalledWith(3)
    expect(chat.friends.find((f) => f.user.id === 3)!.unreadCount).toBe(0)
    expect(chat.totalUnread).toBe(0)
  })

  it('loadOlder menyisipkan pesan lama di depan dengan cursor', async () => {
    api.history
      .mockResolvedValueOnce({ items: [msg(12, 2, ME)], nextCursor: 12 })
      .mockResolvedValueOnce({ items: [msg(11, ME, 2), msg(10, 2, ME)], nextCursor: null })
    const chat = await started()
    chat.openWindow(user(2, 'Bob'))
    await flushPromises()
    await chat.loadOlder(2)
    expect(api.history).toHaveBeenLastCalledWith(2, 12)
    expect(chat.thread(2).messages.map((m) => m.id)).toEqual([10, 11, 12])
    expect(chat.thread(2).nextCursor).toBeNull()
  })
})

describe('chat store: presence', () => {
  it('online/offline memperbarui daftar, memakai label klien, dan mengurutkan online dulu', async () => {
    const chat = await started()
    sock.fire('presence', { userId: 4, online: true, client: 'MOBILE' })
    expect(chat.friends.find((f) => f.user.id === 4)).toMatchObject({
      online: true,
      client: 'MOBILE',
    })
    expect(chat.friends.map((f) => f.user.id)).toEqual([2, 3, 4, 5])
    sock.fire('presence', { userId: 2, online: false })
    expect(chat.friends.find((f) => f.user.id === 2)).toMatchObject({ online: false, client: null })
    expect(chat.friends.map((f) => f.user.id)).toEqual([3, 4, 2, 5])
    sock.fire('presence', { userId: 999, online: true }) // bukan teman: diabaikan
    expect(chat.friends).toHaveLength(4)
  })

  it('connected mengikuti socket; sambung ulang memuat ulang daftar, sambungan pertama tidak', async () => {
    sock.socket.connected = false
    const chat = await started()
    expect(chat.connected).toBe(false)
    expect(api.friends).toHaveBeenCalledTimes(1)
    sock.fire('connect')
    await flushPromises()
    expect(chat.connected).toBe(true)
    expect(api.friends).toHaveBeenCalledTimes(1) // sambungan pertama sudah dicakup start()
    sock.fire('disconnect')
    expect(chat.connected).toBe(false)
    sock.fire('connect')
    await flushPromises()
    expect(api.friends).toHaveBeenCalledTimes(2)
  })
})

describe('chat store: menerima pesan', () => {
  it('tanpa jendela: belum dibaca bertambah dan riwayat yang belum dimuat tidak disentuh', async () => {
    const chat = await started()
    sock.fire('message:new', msg(20, 2, ME))
    expect(chat.friends.find((f) => f.user.id === 2)!.unreadCount).toBe(1)
    expect(chat.thread(2).messages).toEqual([])
  })

  it('jendela terbuka dan tab terlihat: langsung ditandai terbaca, tanpa menambah belum dibaca', async () => {
    const chat = await started()
    chat.openWindow(user(2, 'Bob'))
    await flushPromises()
    api.read.mockClear()
    sock.fire('message:new', msg(20, 2, ME, 'halo'))
    await flushPromises()
    expect(chat.thread(2).messages.at(-1)!.content).toBe('halo')
    expect(api.read).toHaveBeenCalledWith(2)
    expect(chat.friends.find((f) => f.user.id === 2)!.unreadCount).toBe(0)
  })

  it('jendela diciutkan: belum dibaca bertambah, pesan tetap masuk ke riwayat', async () => {
    const chat = await started()
    chat.openWindow(user(2, 'Bob'))
    await flushPromises()
    chat.toggleMinimize(2)
    sock.fire('message:new', msg(20, 2, ME))
    expect(chat.friends.find((f) => f.user.id === 2)!.unreadCount).toBe(1)
    expect(chat.thread(2).messages.at(-1)!.id).toBe(20)
  })

  it('id sama diabaikan; pesan dari tab lain milik sendiri ditambahkan', async () => {
    const chat = await started()
    chat.openWindow(user(2, 'Bob'))
    await flushPromises()
    sock.fire('message:new', msg(12, 2, ME)) // sudah ada di riwayat
    expect(chat.thread(2).messages).toHaveLength(2)
    sock.fire('message:new', msg(30, ME, 2, 'dari tab lain'))
    expect(chat.thread(2).messages.at(-1)).toMatchObject({ id: 30, content: 'dari tab lain' })
  })

  it('pengirim yang belum ada di daftar (teman baru) memuat ulang daftar', async () => {
    const chat = await started()
    api.friends.mockClear()
    sock.fire('message:new', msg(40, 77, ME))
    await flushPromises()
    expect(api.friends).toHaveBeenCalledTimes(1)
    expect(chat.friends).toHaveLength(4)
  })
})

describe('chat store: mengirim', () => {
  const open = async () => {
    const chat = await started()
    chat.openWindow(user(2, 'Bob'))
    await flushPromises()
    return chat
  }

  it('optimistis: pending dulu, ack mengganti dengan pesan server', async () => {
    const chat = await open()
    let resolve!: (v: unknown) => void
    sock.emitWithAck.mockReturnValue(new Promise((r) => (resolve = r)))
    const done = chat.send(2, '  halo  ')
    const pending = chat.thread(2).messages.at(-1)!
    expect(pending).toMatchObject({ content: 'halo', pending: true })
    expect(pending.id).toBeLessThan(0)
    expect(sock.emitWithAck).toHaveBeenCalledWith('message:send', {
      toUserId: 2,
      content: 'halo',
      clientId: expect.stringMatching(/^[\w-]{1,64}$/),
    })
    resolve({ ok: true, message: msg(50, ME, 2, 'halo') })
    await done
    expect(chat.thread(2).messages.at(-1)).toMatchObject({ id: 50, content: 'halo' })
    expect(chat.thread(2).messages.some((m) => m.pending)).toBe(false)
  })

  it('message:new tiba sebelum ack: tidak ada pesan ganda', async () => {
    const chat = await open()
    let resolve!: (v: unknown) => void
    sock.emitWithAck.mockReturnValue(new Promise((r) => (resolve = r)))
    const done = chat.send(2, 'halo')
    sock.fire('message:new', msg(50, ME, 2, 'halo')) // dari server, sebelum ack
    resolve({ ok: true, message: msg(50, ME, 2, 'halo') })
    await done
    expect(chat.thread(2).messages.filter((m) => m.content === 'halo')).toHaveLength(1)
  })

  it('kosong atau spasi saja tidak dikirim', async () => {
    const chat = await open()
    expect(chat.send(2, '   ')).toBeUndefined()
    expect(sock.emitWithAck).not.toHaveBeenCalled()
  })

  it('socket putus: jatuh ke REST dengan clientId yang sama', async () => {
    const chat = await open()
    sock.socket.connected = false
    api.send.mockResolvedValue(msg(51, ME, 2, 'via rest'))
    await chat.send(2, 'via rest')
    expect(sock.emitWithAck).not.toHaveBeenCalled()
    expect(api.send).toHaveBeenCalledWith(2, 'via rest', expect.stringMatching(/^[\w-]{1,64}$/))
    expect(chat.thread(2).messages.at(-1)).toMatchObject({ id: 51 })
  })

  it('timeout ack: REST dengan clientId yang sama dengan yang dikirim lewat socket', async () => {
    const chat = await open()
    sock.emitWithAck.mockRejectedValue(new Error('timeout'))
    api.send.mockResolvedValue(msg(52, ME, 2, 'x'))
    await chat.send(2, 'x')
    const socketId = (sock.emitWithAck.mock.calls[0]![1] as { clientId: string }).clientId
    expect(api.send.mock.calls[0]![2]).toBe(socketId)
  })

  it('gagal di socket dan REST: ditandai failed; retry berhasil', async () => {
    const chat = await open()
    sock.emitWithAck.mockResolvedValue({ ok: false })
    api.send.mockRejectedValueOnce(new Error('x'))
    await chat.send(2, 'gagal')
    const failed = chat.thread(2).messages.at(-1)!
    expect(failed).toMatchObject({ failed: true, pending: false })

    sock.emitWithAck.mockResolvedValue({ ok: true, message: msg(60, ME, 2, 'gagal') })
    await chat.retry(2, failed.id)
    expect(chat.thread(2).messages.at(-1)).toMatchObject({ id: 60 })
    expect(chat.thread(2).messages.some((m) => m.failed)).toBe(false)
  })
})

describe('chat store: mengetik dan terbaca (CHT-04)', () => {
  const emitted = () => sock.emit.mock.calls.map((c) => [c[0], c[1]])

  it('event typing dari lawan menyalakan indikator dan padam sendiri setelah 6 detik', async () => {
    vi.useFakeTimers()
    const chat = useChatStore()
    chat.start()
    sock.fire('typing', { userId: 2, isTyping: true })
    expect(chat.typing[2]).toBe(true)
    await vi.advanceTimersByTimeAsync(5900)
    expect(chat.typing[2]).toBe(true)
    await vi.advanceTimersByTimeAsync(200)
    expect(chat.typing[2]).toBe(false)
    vi.useRealTimers()
  })

  it('isTyping false memadamkan; pesan dari lawan juga memadamkan', async () => {
    const chat = await started()
    sock.fire('typing', { userId: 2, isTyping: true })
    sock.fire('typing', { userId: 2, isTyping: false })
    expect(chat.typing[2]).toBe(false)
    sock.fire('typing', { userId: 2, isTyping: true })
    sock.fire('message:new', msg(80, 2, ME))
    expect(chat.typing[2]).toBe(false)
  })

  it('mengetik: true sekali per detik, false setelah 3 detik diam', async () => {
    vi.useFakeTimers()
    const chat = useChatStore()
    chat.start()
    chat.notifyTyping(2, 'h')
    chat.notifyTyping(2, 'ha')
    chat.notifyTyping(2, 'hal')
    expect(emitted()).toEqual([['typing', { toUserId: 2, isTyping: true }]])
    await vi.advanceTimersByTimeAsync(1100)
    chat.notifyTyping(2, 'halo')
    expect(emitted()).toHaveLength(2) // lewat satu detik: true lagi
    await vi.advanceTimersByTimeAsync(3100)
    expect(emitted().at(-1)).toEqual(['typing', { toUserId: 2, isTyping: false }])
    expect(emitted()).toHaveLength(3)
    vi.useRealTimers()
  })

  it('teks dikosongkan, kirim pesan, dan tutup jendela mengirim false satu kali', async () => {
    const chat = await started()
    sock.emitWithAck.mockResolvedValue({ ok: true, message: msg(90, ME, 2, 'x') })
    chat.openWindow(user(2, 'Bob'))
    await flushPromises()

    chat.notifyTyping(2, 'abc')
    chat.notifyTyping(2, '  ')
    expect(emitted().map((e) => (e[1] as { isTyping: boolean }).isTyping)).toEqual([true, false])
    chat.stopTyping(2) // sudah berhenti: tidak ada false kedua
    expect(emitted()).toHaveLength(2)

    chat.notifyTyping(2, 'abc')
    await chat.send(2, 'abc')
    expect(emitted().at(-1)).toEqual(['typing', { toUserId: 2, isTyping: false }])

    sock.emit.mockClear()
    chat.notifyTyping(2, 'def')
    chat.closeWindow(2)
    expect(emitted().map((e) => (e[1] as { isTyping: boolean }).isTyping)).toEqual([true, false])
  })

  it('socket putus: tidak mengirim apa pun', async () => {
    const chat = await started()
    sock.socket.connected = false
    chat.notifyTyping(2, 'abc')
    expect(sock.emit).not.toHaveBeenCalled()
  })

  it('message:read menandai pesan saya sampai upToMessageId; pesan lawan dan pending tidak', async () => {
    api.history.mockResolvedValue({
      items: [msg(14, 2, ME), msg(13, ME, 2), msg(12, ME, 2), msg(11, ME, 2)],
      nextCursor: null,
    })
    const chat = await started()
    chat.openWindow(user(2, 'Bob'))
    await flushPromises()
    sock.fire('message:read', { byUserId: 2, upToMessageId: 12 })
    const read = (id: number) => chat.thread(2).messages.find((m) => m.id === id)!.readAt
    expect(read(11)).not.toBeNull()
    expect(read(12)).not.toBeNull()
    expect(read(13)).toBeNull() // lebih baru dari yang dibaca
    expect(read(14)).toBeNull() // milik lawan
  })
})

describe('ChatSidebar', () => {
  const mountSidebar = () => mount(ChatSidebar)

  it('daftar teman: titik hijau dan label Web atau Mobile hanya untuk yang online', async () => {
    await started()
    const w = mountSidebar()
    const rows = w.findAll('.chat__row')
    expect(rows.map((r) => r.find('.chat__name').text())).toEqual(['Bob', 'Carol', 'Dave', 'Erin'])
    expect(rows[0]!.find('.chat__client').text()).toBe('Web')
    expect(rows[1]!.find('.chat__client').text()).toBe('Mobile')
    expect(rows[1]!.find('.chat__unread').text()).toBe('2')
    expect(rows[2]!.find('.chat__dot').exists()).toBe(false)
    expect(rows[0]!.find('.chat__dot--stale').exists()).toBe(false)
  })

  it('socket putus: titik menjadi abu dan ada penanda menyambung ulang', async () => {
    sock.socket.connected = false
    await started()
    const w = mountSidebar()
    expect(w.find('.chat__dot--stale').exists()).toBe(true)
    expect(w.text()).toContain('Reconnecting…')
  })

  it('tanpa teman: ajakan menambah teman', async () => {
    api.friends.mockResolvedValue({ items: [] })
    await started()
    expect(mountSidebar().text()).toContain('Add friends to start chatting.')
  })

  it('kotak cari menyaring berdasarkan nama; klik membuka jendela', async () => {
    const chat = await started()
    const w = mountSidebar()
    await w.find('input[type="search"]').setValue('ca')
    expect(w.findAll('.chat__row')).toHaveLength(1)
    await w.find('.chat__row').trigger('click')
    expect(chat.windows.map((x) => x.user.id)).toEqual([3])
  })
})

describe('ChatDock dan ChatWindow', () => {
  const mountDock = () => mount(ChatDock, { global: { stubs: { RouterLink: true } } })

  it('tanpa jendela tidak merender apa pun', async () => {
    await started()
    expect(mountDock().find('.dock').exists()).toBe(false)
  })

  it('jendela menampilkan riwayat; kirim lewat form membersihkan input dan memanggil store', async () => {
    const chat = await started()
    sock.emitWithAck.mockResolvedValue({ ok: true, message: msg(70, ME, 2, 'halo bob') })
    chat.openWindow(user(2, 'Bob'))
    const w = mountDock()
    await flushPromises()
    expect(w.findAll('.msg').map((m) => m.text())).toEqual(['m11', 'm12'])
    expect(w.findAll('.msg')[0]!.classes()).toContain('msg--mine')
    expect(w.findAll('.msg')[1]!.classes()).not.toContain('msg--mine')

    await w.find('input').setValue('halo bob')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect((w.find('input').element as HTMLInputElement).value).toBe('')
    expect(w.findAll('.msg').at(-1)!.text()).toBe('halo bob')
  })

  it('isi pesan ditampilkan sebagai teks, bukan HTML', async () => {
    api.history.mockResolvedValue({
      items: [msg(1, 2, ME, '<img src=x onerror=alert(1)>')],
      nextCursor: null,
    })
    const chat = await started()
    chat.openWindow(user(2, 'Bob'))
    const w = mountDock()
    await flushPromises()
    expect(w.find('.msg img').exists()).toBe(false)
    expect(w.find('.msg__text').text()).toBe('<img src=x onerror=alert(1)>')
  })

  it('judul menciutkan dan mengembangkan; tombol tutup menghapus jendela', async () => {
    const chat = await started()
    chat.openWindow(user(2, 'Bob'))
    const w = mountDock()
    await flushPromises()
    expect(w.find('.win__log').exists()).toBe(true)
    await w.find('.win__title').trigger('click')
    expect(w.find('.win__log').exists()).toBe(false)
    expect(w.find('.win__title').attributes('aria-expanded')).toBe('false')
    await w.find('.win__title').trigger('click')
    expect(w.find('.win__log').exists()).toBe(true)
    await w.find('.win__close').trigger('click')
    expect(w.find('.win').exists()).toBe(false)
  })

  it('indikator mengetik muncul di jendela; mengetik di kotak pesan memberi tahu lawan', async () => {
    const chat = await started()
    chat.openWindow(user(2, 'Bob'))
    const w = mountDock()
    await flushPromises()
    expect(w.find('.win__typing').exists()).toBe(false)
    sock.fire('typing', { userId: 2, isTyping: true })
    await flushPromises()
    expect(w.find('.win__typing').text()).toBe('Bob is typing...')
    sock.fire('typing', { userId: 2, isTyping: false })
    await flushPromises()
    expect(w.find('.win__typing').exists()).toBe(false)

    await w.find('input').setValue('ha')
    expect(sock.emit).toHaveBeenCalledWith('typing', { toUserId: 2, isTyping: true })
  })

  it('"Seen" di bawah pesan terakhir saya yang sudah dibaca, dan berpindah saat yang lebih baru dibaca', async () => {
    api.history.mockResolvedValue({
      items: [msg(13, 2, ME), msg(12, ME, 2), msg(11, ME, 2)],
      nextCursor: null,
    })
    const chat = await started()
    chat.openWindow(user(2, 'Bob'))
    const w = mountDock()
    await flushPromises()
    expect(w.find('.msg__seen').exists()).toBe(false)

    sock.fire('message:read', { byUserId: 2, upToMessageId: 11 })
    await flushPromises()
    expect(w.findAll('.msg__seen')).toHaveLength(1)
    expect(w.findAll('.msg')[0]!.find('.msg__seen').text()).toBe('Seen') // pesan 11, bukan 12

    sock.fire('message:read', { byUserId: 2, upToMessageId: 12 })
    await flushPromises()
    expect(w.findAll('.msg__seen')).toHaveLength(1)
    expect(w.findAll('.msg')[1]!.find('.msg__seen').exists()).toBe(true) // pindah ke pesan 12
    expect(w.findAll('.msg')[0]!.find('.msg__seen').exists()).toBe(false)
  })

  it('"Load older messages" muncul bila ada cursor; pesan gagal punya tombol Retry', async () => {
    api.history.mockResolvedValue({ items: [msg(12, 2, ME)], nextCursor: 12 })
    const chat = await started()
    chat.openWindow(user(2, 'Bob'))
    const w = mountDock()
    await flushPromises()
    expect(w.find('.win__older').text()).toBe('Load older messages')

    sock.emitWithAck.mockResolvedValue({ ok: false })
    api.send.mockRejectedValue(new Error('x'))
    await chat.send(2, 'gagal')
    await flushPromises()
    expect(w.find('.msg__failed').text()).toContain('Not sent.')
    expect(w.find('.msg__failed button').text()).toBe('Retry')
  })

  it('riwayat kosong: "Say hello!"; gagal memuat: pesan error', async () => {
    api.history.mockResolvedValueOnce({ items: [], nextCursor: null })
    const chat = await started()
    chat.openWindow(user(2, 'Bob'))
    const w = mountDock()
    await flushPromises()
    expect(w.text()).toContain('Say hello!')

    api.history.mockRejectedValueOnce(new Error('x'))
    chat.openWindow(user(4, 'Dave'))
    await flushPromises()
    expect(w.text()).toContain('Could not load messages.')
  })
})

describe('MessagesJewel', () => {
  const mountJewel = () => mount(MessagesJewel, { attachTo: document.body })
  const convo = (u: UserSummary, last: string, unread: number): Conversation => ({
    user: u,
    lastMessage: msg(1, u.id, ME, last),
    unreadCount: unread,
  })

  it('badge = total belum dibaca; dropdown memuat percakapan; klik membuka jendela', async () => {
    const chat = await started()
    api.conversations.mockResolvedValue({
      items: [convo(user(3, 'Carol'), 'sampai jumpa', 2), convo(user(2, 'Bob'), 'oke', 0)],
      nextCursor: null,
    })
    const w = mountJewel()
    expect(w.find('.jewel__badge').text()).toBe('2')
    await w.find('button').trigger('click')
    await flushPromises()
    const items = w.findAll('.item')
    expect(items).toHaveLength(2)
    expect(items[0]!.text()).toContain('sampai jumpa')
    expect(items[0]!.classes()).toContain('is-new')
    await items[0]!.trigger('click')
    expect(chat.windows.map((x) => x.user.id)).toEqual([3])
    expect(w.find('.list').exists()).toBe(false) // dropdown tertutup
    w.unmount()
  })

  it('kosong dan gagal punya pesan sendiri', async () => {
    await started()
    const w = mountJewel()
    await w.find('button').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('No new messages.')
    await w.find('button').trigger('click')
    api.conversations.mockRejectedValueOnce(new Error('x'))
    await w.find('button').trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').exists()).toBe(true)
    w.unmount()
  })
})
