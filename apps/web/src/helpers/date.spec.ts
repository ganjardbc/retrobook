import { describe, expect, it } from 'vitest'
import { localDate } from '@/helpers/date'

describe('localDate', () => {
  it('memakai komponen lokal dengan nol di depan', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(localDate(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31')
  })
})
