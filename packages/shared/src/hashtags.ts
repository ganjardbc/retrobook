/** Maksimal hashtag yang dikenali per post; sisanya dianggap teks biasa (cegah spam tag). */
export const MAX_HASHTAGS = 10

// `#kata` harus diawali batas kata dan panjang kata 1 sampai 50 (kolom hashtags.tag).
// Kata lebih panjang dari 50 bukan hashtag; "a#b" dan "&#39;" juga bukan.
const HASHTAG = /(?<![\p{L}\p{N}_&#])#([\p{L}\p{N}_]{1,50})(?![\p{L}\p{N}_])/gu

export type TextPart = { text: string; tag?: string }

/** Pecah teks menjadi potongan biasa dan hashtag (`tag` huruf kecil). Dipakai server dan tampilan. */
export function splitHashtags(text: string): TextPart[] {
  const parts: TextPart[] = []
  const seen = new Set<string>()
  let last = 0
  for (const m of text.matchAll(HASHTAG)) {
    const tag = m[1]!.toLowerCase()
    if (!seen.has(tag) && seen.size >= MAX_HASHTAGS) continue
    seen.add(tag)
    if (m.index > last) parts.push({ text: text.slice(last, m.index) })
    parts.push({ text: m[0], tag })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}

/** Hashtag unik (huruf kecil, tanpa `#`) pada teks, urut kemunculan, maksimal MAX_HASHTAGS. */
export function extractHashtags(text: string): string[] {
  return [...new Set(splitHashtags(text).flatMap((p) => (p.tag ? [p.tag] : [])))]
}
