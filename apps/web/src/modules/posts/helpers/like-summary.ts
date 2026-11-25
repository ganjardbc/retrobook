import type { Post } from '@retrobook/shared'
import { t } from '@retrobook/shared/i18n'

/** Potongan kalimat: teks biasa, atau nama yang dijadikan tautan ke profil. */
export type SummaryPart = { text: string; username?: string }

/**
 * "A, B, and 3 others like this." (INT-01). "You" didahulukan bila viewer ikut menyukai.
 * `likedPreview` dari server berisi dua penyuka terbaru; viewer disaring agar tidak tercatat dua kali.
 */
export function likeSummaryParts(post: Post, meId: string | null): SummaryPart[] {
  if (post.likeCount <= 0) return []

  const others = post.likedPreview.filter((u) => u.id !== meId)
  const names: { label: string; username?: string }[] = []
  if (post.likedByMe) names.push({ label: t('like.you') })
  for (const u of others) {
    if (names.length >= 2) break
    names.push({ label: u.displayName, username: u.username })
  }
  const rest = Math.max(0, post.likeCount - names.length)
  const [a, b] = names

  if (!a) return []
  let template: string
  if (rest > 0 && b) template = t('like.summary.more')
  else if (b) template = t('like.summary.2')
  else template = t(a.username === undefined ? 'like.summary.1.you' : 'like.summary.1')

  // Hanya satu nama tersedia padahal penyuka lebih banyak (pratinjau kosong): tampilkan jumlahnya.
  if (rest > 0 && !b) {
    template = t('like.summary.2')
    names.push({ label: t(rest === 1 ? 'like.others.one' : 'like.others.many', { n: rest }) })
  }

  const values: Record<string, SummaryPart> = {
    a: { text: names[0]!.label, username: names[0]!.username },
    b: { text: names[1]?.label ?? '', username: names[1]?.username },
    others: { text: t(rest === 1 ? 'like.others.one' : 'like.others.many', { n: rest }) },
  }
  return template
    .split(/(\{\w+\})/)
    .filter((s) => s !== '')
    .map((chunk) => {
      const m = /^\{(\w+)\}$/.exec(chunk)
      return m ? (values[m[1]!] ?? { text: chunk }) : { text: chunk }
    })
}

export const likeSummaryText = (post: Post, meId: string | null) =>
  likeSummaryParts(post, meId)
    .map((p) => p.text)
    .join('')
