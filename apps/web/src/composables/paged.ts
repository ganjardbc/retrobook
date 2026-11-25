import { ref, type Ref } from 'vue'

type Page<T> = { items: T[]; nextCursor: string | null; total?: number }

/**
 * Daftar berhalaman (kursor) generik untuk tab profil (teman, foto). Aman dipanggil berulang;
 * respons yang datang setelah reset (ganti profil) dibuang lewat penghitung generasi.
 */
export function usePaged<T>(
  fetchPage: (cursor: string | null) => Promise<Page<T>>,
  keyOf: (item: T) => string | number,
) {
  const nextCursor = ref<string | null>(null)
  const done = ref(false)
  const loading = ref(false)
  const failed = ref(false)
  const total = ref(0)
  let generation = 0

  // Tipe eksplisit: ref<T[]> pada T generik membuat Vue mengurai tipe T menjadi UnwrapRef<T>.
  const list = ref([]) as Ref<T[]>

  function reset() {
    generation++
    list.value = []
    nextCursor.value = null
    done.value = false
    loading.value = false
    failed.value = false
    total.value = 0
  }

  async function loadMore() {
    if (loading.value || done.value) return
    loading.value = true
    failed.value = false
    const gen = generation
    try {
      const page = await fetchPage(nextCursor.value)
      if (gen !== generation) return
      const known = new Set(list.value.map(keyOf))
      list.value.push(...page.items.filter((i) => !known.has(keyOf(i))))
      nextCursor.value = page.nextCursor
      done.value = page.nextCursor === null
      if (page.total !== undefined) total.value = page.total
    } catch {
      if (gen === generation) failed.value = true
    } finally {
      if (gen === generation) loading.value = false
    }
  }

  return { items: list, nextCursor, done, loading, failed, total, reset, loadMore }
}
