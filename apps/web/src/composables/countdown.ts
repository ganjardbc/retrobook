import { computed, onBeforeUnmount, ref } from 'vue'

/** Hitung mundur detik (mis. jeda 429): `start(n)` mengisi, `remaining` turun tiap detik sampai 0. */
export function useCountdown() {
  const remaining = ref(0)
  let timer: ReturnType<typeof setInterval> | undefined

  function stop() {
    clearInterval(timer)
    timer = undefined
  }
  function start(seconds: number) {
    stop()
    remaining.value = Math.max(0, Math.ceil(seconds))
    if (remaining.value === 0) return
    timer = setInterval(() => {
      remaining.value -= 1
      if (remaining.value <= 0) stop()
    }, 1000)
  }
  onBeforeUnmount(stop)

  return { remaining, active: computed(() => remaining.value > 0), start }
}
