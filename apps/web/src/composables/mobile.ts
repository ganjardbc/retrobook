import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Breakpoint yang sama dengan `@media` di CSS (CSS tidak bisa memakai variabel di media query, jadi
 * angkanya ditulis di dua tempat: di sini dan di blok `@media` komponen terkait).
 */
/** Ponsel: bar tab, laci selebar layar, jendela chat layar penuh (NavBar, AppLayout, ChatDock). */
export const MOBILE_QUERY = '(max-width: 640px)'
/** Sempit: strip chat dan kolom kanan hilang, laci menu dipakai (AppLayout). */
export const NARROW_QUERY = '(max-width: 900px)'
/** Halaman Messages: daftar dan percakapan bergantian (MessagesView). */
export const COMPACT_QUERY = '(max-width: 700px)'

/** `true` selama media query cocok; ikut berubah saat layar diputar atau jendela diubah ukurannya. */
export function useMediaQuery(query: string) {
  const mq =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query)
      : null
  const matches = ref(mq?.matches ?? false)
  const update = () => (matches.value = mq?.matches ?? false)
  onMounted(() => mq?.addEventListener('change', update))
  onBeforeUnmount(() => mq?.removeEventListener('change', update))
  return matches
}

/** Lebar layar ≤640 px (ponsel). */
export const useMobile = () => useMediaQuery(MOBILE_QUERY)
