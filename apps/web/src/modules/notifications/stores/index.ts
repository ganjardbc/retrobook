import type { AppNotification } from '@retrobook/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSocket } from '@/plugins/realtime'
import { notificationsApi } from '@/modules/notifications/services/api'

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<AppNotification[]>([])
  const unread = ref(0)
  const loading = ref(false)
  const failed = ref(false)
  /** Id yang belum dibaca saat dropdown dibuka; dipakai untuk sorotan sampai ditutup. */
  const fresh = ref<Set<number>>(new Set())
  /** Notifikasi realtime terakhir; jewel lain (mis. permintaan teman) memantaunya. */
  const lastReceived = ref<AppNotification | null>(null)

  async function refreshCount() {
    try {
      unread.value = (await notificationsApi.unreadCount()).count
    } catch {
      /* badge lama dipertahankan */
    }
  }

  /** Dropdown dibuka: muat daftar terbaru lalu tandai semuanya terbaca (NTF-02). */
  async function open() {
    loading.value = true
    failed.value = false
    try {
      const page = await notificationsApi.list()
      items.value = page.items
      fresh.value = new Set(page.items.filter((n) => !n.readAt).map((n) => n.id))
      if (unread.value > 0) unread.value = (await notificationsApi.markRead()).count
    } catch {
      failed.value = true
    } finally {
      loading.value = false
    }
  }

  function receive(n: AppNotification, dropdownOpen = false) {
    lastReceived.value = n
    if (items.value.some((i) => i.id === n.id)) return
    items.value.unshift(n)
    if (dropdownOpen) {
      fresh.value.add(n.id)
      void notificationsApi.markRead([n.id]).catch(() => {})
    } else {
      unread.value += 1
    }
  }

  let stopListening: (() => void) | null = null

  /** Mulai mendengarkan realtime dan ambil hitungan awal; aman dipanggil berulang. */
  function start(isOpen: () => boolean = () => false) {
    if (stopListening) return
    const socket = getSocket()
    const onNew = (n: AppNotification) => receive(n, isOpen())
    socket.on('notification:new', onNew)
    // Setelah putus lalu tersambung lagi, event yang terlewat hanya terlihat lewat hitungan.
    socket.io.on('reconnect', refreshCount)
    stopListening = () => {
      socket.off('notification:new', onNew)
      socket.io.off('reconnect', refreshCount)
    }
    void refreshCount()
  }

  function stop() {
    stopListening?.()
    stopListening = null
    items.value = []
    unread.value = 0
    fresh.value = new Set()
    lastReceived.value = null
    failed.value = false
  }

  return {
    items,
    unread,
    loading,
    failed,
    fresh,
    lastReceived,
    refreshCount,
    open,
    receive,
    start,
    stop,
  }
})
