/**
 * Kursor keyset untuk urutan `[createdAt desc, id desc]`: baris yang berada SETELAH baris kursor.
 * Dipakai di tempat Prisma `cursor` tidak bisa (raw SQL, pemindaian batch). Urutan tidak boleh bergantung
 * pada nilai `id` saja: id tidak dijamin menaik menurut waktu (mis. UUID acak).
 */
export const afterCursor = (c: { createdAt: Date; id: string }) => ({
  OR: [{ createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } }],
})

export const NEWEST_FIRST = [{ createdAt: 'desc' as const }, { id: 'desc' as const }]
export const OLDEST_FIRST = [{ createdAt: 'asc' as const }, { id: 'asc' as const }]

/** Pembanding untuk id (angka atau string) pada `Array.sort`; `a - b` gagal untuk string. */
export const cmp = <T extends number | string>(a: T, b: T): number => (a > b ? 1 : a < b ? -1 : 0)
