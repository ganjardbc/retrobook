import { describe, expect, it } from 'vitest'
import { formatTime } from './time'

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
