import type { ChatFriend, ChatMessage, UserSummary } from '@retrobook/shared'
import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { useAuthStore } from '@/modules/auth/stores'
import { chatApi } from '@/modules/chat/services/api'
import { getSocket } from '@/plugins/realtime'

/** Pesan di layar: `pending` sebelum ack server (id negatif), `failed` bila gagal dikirim. */
export type LocalMessage = ChatMessage & { pending?: boolean; failed?: boolean; clientId?: string }
export type Thread = {
  messages: LocalMessage[]
  nextCursor: number | null
  loading: boolean
  loaded: boolean
  failed: boolean
}
export type ChatWindow = { user: UserSummary; minimized: boolean }

export const MAX_WINDOWS = 3
const ACK_TIMEOUT_MS = 8000
/** Kirim "mengetik" paling sering sekali per detik; berhenti dianggap setelah 3 detik tanpa ketikan. */
const TYPING_THROTTLE_MS = 1000
const TYPING_IDLE_MS = 3000
/** Indikator lawan hilang sendiri bila tak ada kabar lagi (mis. ia putus di tengah mengetik). */
const TYPING_EXPIRE_MS = 6000

const byPresence = (a: ChatFriend, b: ChatFriend) =>
  Number(b.online) - Number(a.online) || a.user.displayName.localeCompare(b.user.displayName)

/** Gabung dua daftar pesan: tanpa duplikat id, yang sudah punya id urut naik, yang pending di akhir. */
function merge(a: LocalMessage[], b: LocalMessage[]): LocalMessage[] {
  const seen = new Map<number, LocalMessage>()
  for (const m of [...a, ...b]) if (!seen.has(m.id)) seen.set(m.id, m)
  const all = [...seen.values()]
  return [
    ...all.filter((m) => !m.pending).sort((x, y) => x.id - y.id),
    ...all.filter((m) => m.pending),
  ]
}

export const useChatStore = defineStore('chat', () => {
  const auth = useAuthStore()
  const friends = ref<ChatFriend[]>([])
  const friendsLoading = ref(false)
  const friendsFailed = ref(false)
  /** false: titik online menjadi abu (status tidak diketahui) sampai tersambung lagi. */
  const connected = ref(false)
  const windows = ref<ChatWindow[]>([])
  const threads = reactive<Record<number, Thread>>({})
  const totalUnread = computed(() => friends.value.reduce((n, f) => n + f.unreadCount, 0))
  /** userId -> sedang mengetik kepada saya (CHT-04). */
  const typing = reactive<Record<number, boolean>>({})
  const typingTimers = new Map<number, ReturnType<typeof setTimeout>>()
  const outgoing = new Map<number, { last: number; idle: ReturnType<typeof setTimeout> }>()
  let tempSeq = 0

  const me = () => auth.user?.id ?? 0
  const friendOf = (id: number) => friends.value.find((f) => f.user.id === id)

  function thread(userId: number): Thread {
    // `??=` mengembalikan objek mentah; baca ulang dari `threads` supaya yang dipakai adalah proxy reaktif.
    threads[userId] ??= {
      messages: [],
      nextCursor: null,
      loading: false,
      loaded: false,
      failed: false,
    }
    return threads[userId]!
  }

  async function loadFriends() {
    friendsLoading.value = true
    friendsFailed.value = false
    try {
      friends.value = (await chatApi.friends()).items
    } catch {
      friendsFailed.value = true
    } finally {
      friendsLoading.value = false
    }
  }

  async function loadLatest(userId: number) {
    const t = thread(userId)
    if (t.loaded || t.loading) return
    t.loading = true
    t.failed = false
    try {
      const page = await chatApi.history(userId)
      t.messages = merge(t.messages, [...page.items].reverse())
      t.nextCursor = page.nextCursor
      t.loaded = true
    } catch {
      t.failed = true
    } finally {
      t.loading = false
    }
  }

  async function loadOlder(userId: number) {
    const t = thread(userId)
    if (t.loading || t.nextCursor === null) return
    t.loading = true
    try {
      const page = await chatApi.history(userId, t.nextCursor)
      t.messages = merge([...page.items].reverse(), t.messages)
      t.nextCursor = page.nextCursor
    } catch {
      t.failed = true
    } finally {
      t.loading = false
    }
  }

  async function markRead(userId: number) {
    const f = friendOf(userId)
    if (f) f.unreadCount = 0
    try {
      await chatApi.read(userId)
    } catch {
      /* badge lokal sudah nol; server menyusul pada pembukaan berikutnya */
    }
  }

  function onTyping(p: { userId: number; isTyping: boolean }) {
    clearTimeout(typingTimers.get(p.userId))
    typing[p.userId] = p.isTyping
    if (p.isTyping) {
      typingTimers.set(
        p.userId,
        setTimeout(() => (typing[p.userId] = false), TYPING_EXPIRE_MS),
      )
    }
  }

  /** Lawan membaca pesan saya sampai `upToMessageId`: tandai terbaca di jendela (indikator "Seen"). */
  function onRead(p: { byUserId: number; upToMessageId: number }) {
    const at = new Date().toISOString()
    for (const m of thread(p.byUserId).messages) {
      if (m.senderId === me() && m.id > 0 && m.id <= p.upToMessageId && !m.readAt) m.readAt = at
    }
  }

  function emitTyping(userId: number, isTyping: boolean) {
    const socket = getSocket()
    if (socket.connected) socket.emit('typing', { toUserId: userId, isTyping })
  }

  /** Dipanggil tiap ketikan di kotak pesan; teks kosong berarti berhenti mengetik. */
  function notifyTyping(userId: number, text: string) {
    if (!text.trim()) return stopTyping(userId)
    const now = Date.now()
    const st = outgoing.get(userId)
    clearTimeout(st?.idle)
    let last = st?.last ?? 0
    if (now - last >= TYPING_THROTTLE_MS) {
      emitTyping(userId, true)
      last = now
    }
    outgoing.set(userId, { last, idle: setTimeout(() => stopTyping(userId), TYPING_IDLE_MS) })
  }

  function stopTyping(userId: number) {
    const st = outgoing.get(userId)
    if (!st) return
    clearTimeout(st.idle)
    outgoing.delete(userId)
    emitTyping(userId, false)
  }

  function openWindow(user: UserSummary) {
    const existing = windows.value.find((w) => w.user.id === user.id)
    if (existing) existing.minimized = false
    else {
      windows.value.push({ user, minimized: false })
      // Maksimal tiga jendela: yang tertua ditutup (CHT-03).
      while (windows.value.length > MAX_WINDOWS) windows.value.shift()
    }
    void loadLatest(user.id)
    if ((friendOf(user.id)?.unreadCount ?? 0) > 0) void markRead(user.id)
  }

  function resetThread(userId: number) {
    const t = thread(userId)
    t.messages = []
    t.nextCursor = null
    t.loaded = true
    t.failed = false
    const f = friendOf(userId)
    if (f) f.unreadCount = 0
  }

  /** Clear chat: riwayat hilang dari layar saya saja. Galat dilempar ke pemanggil. */
  async function clearHistory(userId: number) {
    await chatApi.clear(userId)
    resetThread(userId)
  }

  /** Hapus sesi: riwayat hilang, teman disembunyikan dari daftar Messages, jendela melayang ditutup. */
  async function removeSession(userId: number) {
    await chatApi.remove(userId)
    resetThread(userId)
    const f = friendOf(userId)
    if (f) f.hidden = true
    closeWindow(userId)
  }

  function closeWindow(userId: number) {
    stopTyping(userId)
    windows.value = windows.value.filter((w) => w.user.id !== userId)
  }

  function toggleMinimize(userId: number) {
    const w = windows.value.find((x) => x.user.id === userId)
    if (!w) return
    w.minimized = !w.minimized
    if (!w.minimized && (friendOf(userId)?.unreadCount ?? 0) > 0) void markRead(userId)
  }

  function replacePending(userId: number, tempId: number, real: ChatMessage) {
    const t = thread(userId)
    const without = t.messages.filter((m) => m.id !== tempId)
    // message:new bisa tiba lebih dulu dari ack: kalau begitu cukup buang yang pending.
    t.messages = merge(without, without.some((m) => m.id === real.id) ? [] : [real])
  }

  /** Kirim lewat socket dengan ack; jaringan atau timeout jatuh ke REST dengan clientId yang sama. */
  async function deliver(userId: number, local: LocalMessage) {
    const clientId = local.clientId!
    try {
      const socket = getSocket()
      if (!socket.connected) throw new Error('offline')
      const ack = (await socket
        .timeout(ACK_TIMEOUT_MS)
        .emitWithAck('message:send', { toUserId: userId, content: local.content, clientId })) as
        { ok: true; message: ChatMessage } | { ok: false }
      if (!ack.ok) return fail(userId, local.id) // ditolak server: REST akan menjawab sama
      replacePending(userId, local.id, ack.message)
    } catch {
      try {
        replacePending(userId, local.id, await chatApi.send(userId, local.content, clientId))
      } catch {
        fail(userId, local.id)
      }
    }
  }

  function fail(userId: number, tempId: number) {
    const m = thread(userId).messages.find((x) => x.id === tempId)
    if (m) {
      m.pending = false
      m.failed = true
    }
  }

  function send(userId: number, text: string) {
    const content = text.trim()
    if (!content) return
    const local: LocalMessage = {
      id: -++tempSeq,
      senderId: me(),
      receiverId: userId,
      content,
      readAt: null,
      createdAt: new Date().toISOString(),
      pending: true,
      clientId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    }
    stopTyping(userId) // mengirim berarti selesai mengetik
    const known = friendOf(userId)
    if (known) known.hidden = false
    const t = thread(userId)
    t.messages = [...t.messages, local]
    return deliver(userId, local)
  }

  function retry(userId: number, tempId: number) {
    const m = thread(userId).messages.find((x) => x.id === tempId)
    if (!m?.failed) return
    m.failed = false
    m.pending = true
    return deliver(userId, m)
  }

  /** Pesan masuk dari socket (`message:new`), baik dari lawan maupun dari tab lain milik sendiri. */
  function receive(msg: ChatMessage) {
    const mine = msg.senderId === me()
    const partner = mine ? msg.receiverId : msg.senderId
    const t = thread(partner)
    if (t.messages.some((m) => m.id === msg.id)) return
    const known = friendOf(partner)
    if (known) known.hidden = false // pesan baru menghidupkan lagi sesi yang dihapus
    // Pesan yang dikirim tab ini: ack-nya yang akan menggantikan pending, jangan ditambah dua kali.
    if (mine && t.messages.some((m) => m.pending && m.content === msg.content)) return
    // Riwayat belum pernah dimuat: loadLatest nanti membawa pesan ini; cukup hitung belum dibaca.
    if (t.loaded || t.loading) t.messages = merge(t.messages, [msg])
    if (mine) return
    onTyping({ userId: partner, isTyping: false }) // pesan sudah tiba, indikator tak perlu lagi

    const w = windows.value.find((x) => x.user.id === partner)
    if (w && !w.minimized && document.visibilityState !== 'hidden') {
      void markRead(partner)
      return
    }
    const f = friendOf(partner)
    if (f) f.unreadCount += 1
    else void loadFriends() // pengirim belum ada di daftar (teman baru)
  }

  function onPresence(p: { userId: number; online: boolean; client?: 'WEB' | 'MOBILE' }) {
    const f = friendOf(p.userId)
    if (!f) return
    f.online = p.online
    f.client = p.online ? (p.client ?? f.client ?? 'WEB') : null
    friends.value = [...friends.value].sort(byPresence)
  }

  let stopListening: (() => void) | null = null

  /** Mulai mendengarkan realtime dan muat daftar teman; aman dipanggil berulang. */
  function start() {
    if (stopListening) return
    const socket = getSocket()
    connected.value = socket.connected
    let hadConnection = socket.connected
    const onConnect = () => {
      connected.value = true
      // Sambung ulang: presence dan pesan yang terlewat. Sambungan pertama sudah dicakup start().
      if (hadConnection) void loadFriends()
      hadConnection = true
    }
    const onDisconnect = () => (connected.value = false)
    socket.on('message:new', receive)
    socket.on('presence', onPresence)
    socket.on('typing', onTyping)
    socket.on('message:read', onRead)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    stopListening = () => {
      socket.off('message:new', receive)
      socket.off('presence', onPresence)
      socket.off('typing', onTyping)
      socket.off('message:read', onRead)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
    void loadFriends()
  }

  function stop() {
    stopListening?.()
    stopListening = null
    friends.value = []
    windows.value = []
    for (const k of Object.keys(threads)) delete threads[Number(k)]
    for (const k of Object.keys(typing)) delete typing[Number(k)]
    typingTimers.forEach(clearTimeout)
    typingTimers.clear()
    outgoing.forEach((o) => clearTimeout(o.idle))
    outgoing.clear()
    connected.value = false
    friendsLoading.value = false
    friendsFailed.value = false
  }

  return {
    friends,
    friendsLoading,
    friendsFailed,
    connected,
    windows,
    threads,
    typing,
    totalUnread,
    thread,
    loadFriends,
    loadLatest,
    loadOlder,
    markRead,
    openWindow,
    closeWindow,
    clearHistory,
    removeSession,
    toggleMinimize,
    send,
    retry,
    notifyTyping,
    stopTyping,
    receive,
    onPresence,
    start,
    stop,
  }
})
