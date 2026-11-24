import { createHash, randomBytes } from 'node:crypto'

/** Refresh token acak; hanya hash SHA-256 (64 hex) yang disimpan di database. */
export const newRefreshToken = () => randomBytes(48).toString('base64url')
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const

/** '15m' | '30d' | '45s' | '12h' -> milidetik. */
export function ttlToMs(ttl: string): number {
  const m = /^(\d+)([smhd])$/.exec(ttl)
  if (!m) throw new Error(`TTL tidak valid: ${ttl}`)
  return Number(m[1]) * UNIT_MS[m[2] as keyof typeof UNIT_MS]
}
