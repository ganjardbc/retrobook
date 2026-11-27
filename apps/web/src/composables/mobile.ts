import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Sama dengan breakpoint ponsel di CSS (NavBar, AppLayout, ChatDock). */
export const MOBILE_QUERY = '(max-width: 640px)'

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
