import { t } from '@retrobook/shared/i18n'

const MIN = 60_000
const HOUR = 60 * MIN

/** "just now", "5 minutes ago", "3 hours ago", lalu tanggal ("March 7 at 10:33 PM"). Waktu ditampilkan di zona pengguna. */
export function formatTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const diff = now.getTime() - then.getTime()
  if (diff < MIN) return t('time.justNow')
  if (diff < HOUR) {
    const n = Math.floor(diff / MIN)
    return n === 1 ? t('time.minuteAgo') : t('time.minutesAgo', { n })
  }
  if (diff < 24 * HOUR) {
    const n = Math.floor(diff / HOUR)
    return n === 1 ? t('time.hourAgo') : t('time.hoursAgo', { n })
  }
  const sameYear = then.getFullYear() === now.getFullYear()
  const date = then.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
  const time = then.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return t('time.at', { date, time })
}
