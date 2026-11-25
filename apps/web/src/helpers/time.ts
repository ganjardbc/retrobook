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

/** Jam pesan: "3:48 PM". */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** Pemisah hari di chat: "Today", "Yesterday", lalu "November 13" (dengan tahun bila bukan tahun ini). */
export function formatDayLabel(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  if (then.toDateString() === now.toDateString()) return t('time.today')
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (then.toDateString() === yesterday.toDateString()) return t('time.yesterday')
  return then.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    ...(then.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  })
}

/** Label singkat terakhir aktif untuk sidebar chat: "5m", "2h", "3d" (minimal 1m). */
export function formatShortAgo(iso: string, now: Date = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime())
  if (diff < HOUR) return `${Math.max(1, Math.floor(diff / MIN))}m`
  if (diff < 24 * HOUR) return `${Math.floor(diff / HOUR)}h`
  return `${Math.floor(diff / (24 * HOUR))}d`
}
