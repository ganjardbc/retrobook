/** Satu baris per pasangan (BR-01): kunci pasangan selalu (min, max), apa pun arah permintaannya. */
export function pairOf(a: number, b: number): { pairLowId: number; pairHighId: number } {
  return { pairLowId: Math.min(a, b), pairHighId: Math.max(a, b) }
}
