import type { PokeItem } from '@retrobook/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { pokesApi } from '@/modules/pokes/services/api'

export const usePokesStore = defineStore('pokes', () => {
  const items = ref<PokeItem[]>([])
  const cursor = ref<string | null>(null)
  const done = ref(false)
  const loading = ref(false)
  const failed = ref(false)
  /** Pemilik data; daftar dibersihkan bila akun berganti. */
  const ownerId = ref<string | null>(null)
  // Respons yang datang setelah reset atau muat ulang dibuang.
  let generation = 0

  function reset(newOwnerId: string | null = null) {
    generation++
    items.value = []
    cursor.value = null
    done.value = false
    loading.value = false
    failed.value = false
    ownerId.value = newOwnerId
  }

  async function load() {
    if (loading.value || done.value) return
    loading.value = true
    failed.value = false
    const gen = generation
    try {
      const page = await pokesApi.list(cursor.value)
      if (gen !== generation) return
      const known = new Set(items.value.map((p) => p.user.id))
      items.value.push(...page.items.filter((p) => !known.has(p.user.id)))
      cursor.value = page.nextCursor
      done.value = page.nextCursor === null
    } catch {
      if (gen === generation) failed.value = true
    } finally {
      if (gen === generation) loading.value = false
    }
  }

  /** Muat ulang dari awal (mis. poke baru masuk lewat realtime). */
  async function refresh() {
    reset(ownerId.value)
    await load()
  }

  /** Poke balik: poke dari `userId` dianggap dibalas, jadi keluar dari daftar. */
  async function pokeBack(userId: string): Promise<boolean> {
    try {
      await pokesApi.poke(userId)
    } catch {
      return false
    }
    items.value = items.value.filter((p) => p.user.id !== userId)
    return true
  }

  async function remove(userId: string): Promise<boolean> {
    try {
      await pokesApi.dismiss(userId)
    } catch {
      return false
    }
    items.value = items.value.filter((p) => p.user.id !== userId)
    return true
  }

  return { items, done, loading, failed, ownerId, reset, load, refresh, pokeBack, remove }
})
