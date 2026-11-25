import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/** Tutup menu (`open = false`) saat klik di luar `root` atau menekan Esc. */
export function useDismissOnOutside(root: Ref<HTMLElement | null>, open: Ref<boolean>) {
  const onClick = (e: MouseEvent) => {
    if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') open.value = false
  }
  onMounted(() => {
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKey)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('click', onClick)
    document.removeEventListener('keydown', onKey)
  })
}
