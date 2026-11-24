import { t } from '@retrobook/shared/i18n'

/** "Born on August 30, 1995 (19 years old)" dari tanggal YYYY-MM-DD. Tanggal diperlakukan sebagai tanggal kalender, bukan zona waktu. */
export function formatBirthday(iso: string, now: Date = new Date()): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  const date = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
  let age = now.getFullYear() - y
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--
  return age >= 0 ? t('profile.info.born.age', { date, n: age }) : t('profile.info.born', { date })
}
