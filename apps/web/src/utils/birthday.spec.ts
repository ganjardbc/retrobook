import { describe, expect, it } from 'vitest'
import { formatBirthday } from './birthday'

describe('formatBirthday', () => {
  const now = new Date(2015, 2, 9) // 9 Maret 2015 (referensi profil)

  it('menampilkan tanggal kalender dan umur', () => {
    expect(formatBirthday('1995-08-30', now)).toBe('Born on August 30, 1995 (19 years old)')
  })
  it('umur bertambah tepat pada hari ulang tahun, tidak sehari sebelumnya', () => {
    expect(formatBirthday('1995-03-09', now)).toContain('(20 years old)')
    expect(formatBirthday('1995-03-10', now)).toContain('(19 years old)')
  })
  it('tanggal tidak bergeser oleh zona waktu', () => {
    expect(formatBirthday('2000-01-01', new Date(2026, 5, 1))).toContain('January 1, 2000')
  })
  it('tanggal lahir di masa depan: tanpa umur negatif', () => {
    expect(formatBirthday('2030-01-01', now)).toBe('Born on January 1, 2030')
  })
})
