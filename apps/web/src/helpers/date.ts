/** Tanggal kalender (YYYY-MM-DD) di zona pengguna, bukan UTC: "hari ini" menurut pengguna. */
export const localDate = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
