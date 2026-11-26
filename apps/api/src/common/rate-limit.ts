import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  Global,
  Injectable,
  Module,
  SetMetadata,
  UseGuards,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AppException } from './app-exception'

/** Batas laju (BR-10, docs/04-api-spec.md 1.2). Jendela tetap per kunci. */
export type RateRule = { name: string; limit: number; windowMs: number; by: 'ip' | 'user' }

export const LOGIN_PER_IP: RateRule = { name: 'login', limit: 10, windowMs: 60_000, by: 'ip' }
export const REGISTER_PER_IP: RateRule = {
  name: 'register',
  limit: 5,
  windowMs: 3_600_000,
  by: 'ip',
}
export const FORGOT_PASSWORD_PER_IP: RateRule = {
  name: 'forgot-password',
  limit: 5,
  windowMs: 3_600_000,
  by: 'ip',
}
export const MESSAGE_PER_USER: RateRule = {
  name: 'message',
  limit: 60,
  windowMs: 60_000,
  by: 'user',
}
export const UPLOAD_PER_USER: RateRule = {
  name: 'upload',
  limit: 60,
  windowMs: 3_600_000,
  by: 'user',
}
export const POKE_PER_USER: RateRule = { name: 'poke', limit: 20, windowMs: 3_600_000, by: 'user' }

type Bucket = { count: number; resetAt: number }
const MAX_KEYS = 20_000

/**
 * Penghitung di memori (hanya satu instance, R-06; bagian dari kebutuhan Redis adapter bila nanti ada banyak
 * instance). `enabled` mati di bawah Jest supaya tes lain tidak saling membatasi; tes rate limit
 * menyalakannya dan mengganti `now`.
 */
@Injectable()
export class RateLimiter {
  // RATE_LIMIT_DISABLED=true hanya dipasang oleh Playwright: e2e mendaftarkan lebih dari 5 user dari satu IP.
  enabled = process.env.NODE_ENV !== 'test' && process.env.RATE_LIMIT_DISABLED !== 'true'
  now: () => number = () => Date.now()
  private readonly buckets = new Map<string, Bucket>()

  /** Hitung satu permintaan; lempar 429 bila batas terlampaui. */
  check(rule: RateRule, id: string | number): void {
    if (!this.enabled) return
    const t = this.now()
    const key = `${rule.name}:${id}`
    let b = this.buckets.get(key)
    if (!b || b.resetAt <= t) {
      this.prune(t)
      b = { count: 0, resetAt: t + rule.windowMs }
      this.buckets.set(key, b)
    }
    if (b.count >= rule.limit) throw tooMany(b.resetAt - t)
    b.count++
  }

  reset() {
    this.buckets.clear()
  }

  private prune(t: number) {
    if (this.buckets.size < MAX_KEYS) return
    for (const [k, v] of this.buckets) if (v.resetAt <= t) this.buckets.delete(k)
    // Masih penuh karena semuanya baru: buang yang paling dulu dibuat supaya memori tetap terbatas.
    while (this.buckets.size >= MAX_KEYS) this.buckets.delete(this.buckets.keys().next().value!)
  }
}

export const tooMany = (waitMs: number, message = 'Too many requests. Please try again later.') =>
  new AppException(429, 'RATE_LIMITED', message, Math.max(1, Math.ceil(waitMs / 1000)))

const RULE = 'rate-rule'

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limiter: RateLimiter,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const rule = this.reflector.get<RateRule | undefined>(RULE, ctx.getHandler())
    if (!rule) return true
    const req = ctx.switchToHttp().getRequest<{ ip?: string; user?: { id: string } }>()
    const id = rule.by === 'user' ? req.user?.id : (req.ip ?? 'unknown')
    // Tanpa identitas (user belum terautentikasi): JwtAuthGuard sudah menolaknya lebih dulu.
    if (id !== undefined) this.limiter.check(rule, id)
    return true
  }
}

/** Pasang batas laju pada satu handler. Berjalan setelah guard global, jadi `req.user` sudah terisi. */
export const RateLimit = (rule: RateRule) =>
  applyDecorators(SetMetadata(RULE, rule), UseGuards(RateLimitGuard))

@Global()
@Module({ providers: [RateLimiter], exports: [RateLimiter] })
export class RateLimitModule {}
