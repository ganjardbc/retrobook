import { Injectable } from '@nestjs/common'
import { RateLimiter, tooMany } from '../../common/rate-limit'

const MAX_FAILURES = 5
const LOCK_MS = 5 * 60_000
/** Kegagalan lama dilupakan: percobaan salah yang tersebar berhari-hari tidak mengunci akun. */
const FORGET_MS = 15 * 60_000
const MAX_KEYS = 20_000

type Entry = { failures: number; lastAt: number; lockedUntil: number }

/**
 * Lima login gagal beruntun untuk satu akun (identifier) memicu jeda 5 menit (API spec 1.2). Berlaku juga
 * untuk identifier yang tidak ada, supaya respons tidak membedakan akun nyata dari yang tidak.
 * Catatan: penyerang bisa mengunci akun korban dengan sengaja gagal login; itu konsekuensi aturan spec.
 */
@Injectable()
export class LoginLockout {
  private readonly entries = new Map<string, Entry>()

  constructor(private readonly limiter: RateLimiter) {}

  private key = (identifier: string) => identifier.trim().toLowerCase()

  /** Lempar 429 bila akun sedang dikunci. Panggil sebelum memeriksa password. */
  assertOpen(identifier: string): void {
    if (!this.limiter.enabled) return
    const e = this.entries.get(this.key(identifier))
    const t = this.limiter.now()
    if (e && e.lockedUntil > t) {
      throw tooMany(e.lockedUntil - t, 'Terlalu banyak percobaan masuk. Coba lagi nanti.')
    }
  }

  recordFailure(identifier: string): void {
    if (!this.limiter.enabled) return
    const k = this.key(identifier)
    const t = this.limiter.now()
    this.prune(t)
    let e = this.entries.get(k)
    if (!e || t - e.lastAt > FORGET_MS || (e.lockedUntil > 0 && e.lockedUntil <= t)) {
      e = { failures: 0, lastAt: t, lockedUntil: 0 }
    }
    e.failures++
    e.lastAt = t
    if (e.failures >= MAX_FAILURES) e.lockedUntil = t + LOCK_MS
    this.entries.set(k, e)
  }

  recordSuccess(identifier: string): void {
    this.entries.delete(this.key(identifier))
  }

  private prune(t: number) {
    if (this.entries.size < MAX_KEYS) return
    for (const [k, v] of this.entries)
      if (t - v.lastAt > FORGET_MS && v.lockedUntil <= t) this.entries.delete(k)
    while (this.entries.size >= MAX_KEYS) this.entries.delete(this.entries.keys().next().value!)
  }
}
