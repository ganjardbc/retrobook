/**
 * Prisma `contains` meneruskan % dan _ ke LIKE sebagai wildcard. Pakai fungsi ini pada masukan
 * pengguna (pencarian, filter) agar karakter itu dicocokkan apa adanya.
 */
export const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&')
