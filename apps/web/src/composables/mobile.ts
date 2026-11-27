import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Sama dengan breakpoint ponsel di CSS (NavBar, AppLayout, ChatDock). */
export const MOBILE_QUERY = '(max-width: 640px)'

/** `true` selama lebar layar ≤640 px; ikut berubah saat layar diputar atau jendela diubah ukurannya. */
export function useMobile() {
  const mq =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(MOBILE_QUERY)
      : null
  const mobile = ref(mq?.matches ?? false)
  const update = () => (mobile.value = mq?.matches ?? false)
  onMounted(() => mq?.addEventListener('change', update))
  onBeforeUnmount(() => mq?.removeEventListener('change', update))
  return mobile
}
