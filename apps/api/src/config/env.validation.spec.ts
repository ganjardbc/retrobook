import 'reflect-metadata'
import { validateEnv } from './env.validation'

const base = { DATABASE_URL: 'mysql://x', JWT_SECRET: 'change-me' }

describe('validateEnv (T-61)', () => {
  const original = process.env.NODE_ENV
  afterEach(() => {
    process.env.NODE_ENV = original
  })

  it('dev menerima rahasia contoh', () => {
    process.env.NODE_ENV = 'development'
    expect(validateEnv(base).JWT_SECRET).toBe('change-me')
  })

  it('production menolak rahasia pendek, placeholder, dan CORS "*"', () => {
    process.env.NODE_ENV = 'production'
    expect(() => validateEnv(base)).toThrow(/JWT_SECRET/)
    expect(() => validateEnv({ ...base, JWT_SECRET: 'x'.repeat(40) + 'secret' })).toThrow(
      /JWT_SECRET/,
    )
    const good = { ...base, JWT_SECRET: 'Qm3vT9zLw2Hn8RkYb5XcJd7PfAe4UgS6iOo1' }
    expect(() => validateEnv({ ...good, CORS_ORIGINS: '*' })).toThrow(/CORS_ORIGINS/)
    expect(validateEnv(good).JWT_SECRET).toBe(good.JWT_SECRET)
  })
})
