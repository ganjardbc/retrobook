/**
 * Sticky yang ikut bergulir sampai dasar elemen terlihat: bila elemen lebih tinggi dari layar,
 * `top` dibuat negatif sehingga elemen menempel setelah dasarnya mencapai dasar layar.
 * Mengisi variabel CSS `--sticky-top` pada elemen; CSS memakainya sebagai `top`.
 */
export function stickyBottom(el: HTMLElement, base: () => number): () => void {
  const update = () => {
    const top = Math.min(base(), window.innerHeight - el.offsetHeight - 12)
    el.style.setProperty('--sticky-top', `${Math.round(top)}px`)
  }
  const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
  ro?.observe(el)
  window.addEventListener('resize', update)
  update()
  return () => {
    ro?.disconnect()
    window.removeEventListener('resize', update)
  }
}
