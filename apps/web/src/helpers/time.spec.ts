import { describe, expect, it } from 'vitest'
import { formatDayLabel, formatShortAgo, formatTime } from '@/helpers/time'

const now = new Date('2026-11-24T12:00:00.000Z')
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()

describe('formatTime', () => {
  it.each([
    [10_000, 'just now'],
    [60_000, '1 minute ago'],
    [5 * 60_000, '5 minutes ago'],
    [59 * 60_000, '59 minutes ago'],
    [60 * 60_000, '1 hour ago'],
    [3 * 3_600_000, '3 hours ago'],
  ])('%d ms lalu -> %s', (ms, text) => {
    expect(formatTime(ago(ms), now)).toBe(text)
  })

  it('lebih dari sehari: tanggal dan jam; tahun hanya bila beda tahun', () => {
    expect(formatTime(ago(3 * 86_400_000), now)).toMatch(/^November \d+ at /)
    expect(formatTime('2024-03-07T10:00:00.000Z', now)).toMatch(/^March 7, 2024 at /)
  })
})

describe('formatShortAgo', () => {
  const now = new Date('2026-01-10T12:00:00Z')
  it.each([
    ['2026-01-10T11:59:59Z', '1m'],
    ['2026-01-10T11:35:00Z', '25m'],
    ['2026-01-10T10:00:00Z', '2h'],
    ['2026-01-07T12:00:00Z', '3d'],
    ['2026-01-10T12:05:00Z', '1m'],
  ])('%s -> %s', (iso, label) => {
    expect(formatShortAgo(iso, now)).toBe(label)
  })
})

describe('formatDayLabel', () => {
  const local = new Date(2026, 10, 24, 12) // tengah hari waktu lokal, aman dari geseran zona
  const day = (y: number, m: number, d: number) => new Date(y, m, d, 9).toISOString()

  it('hari ini, kemarin, lalu tanggal (tahun hanya bila bukan tahun ini)', () => {
    expect(formatDayLabel(day(2026, 10, 24), local)).toBe('Today')
    expect(formatDayLabel(day(2026, 10, 23), local)).toBe('Yesterday')
    expect(formatDayLabel(day(2026, 10, 13), local)).toBe('November 13')
    expect(formatDayLabel(day(2025, 10, 13), local)).toBe('November 13, 2025')
  })
})
