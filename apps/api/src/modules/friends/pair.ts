/** Satu baris per pasangan (BR-01): kunci pasangan selalu (min, max), apa pun arah permintaannya. */
export function pairOf<T extends number | string>(a: T, b: T): { pairLowId: T; pairHighId: T } {
  // Perbandingan `<` (bukan Math.min/max) supaya tetap benar bila id berupa string.
  return a < b ? { pairLowId: a, pairHighId: b } : { pairLowId: b, pairHighId: a }
}
