import { beforeEach, describe, expect, it } from 'vitest'
import { applyTheme, readTheme, setTheme } from '@/helpers/theme'

describe('theme (THM-01)', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('bawaan 2015 tanpa atribut; nilai tak dikenal diabaikan', () => {
    expect(readTheme()).toBe('2015')
    localStorage.setItem('rb.theme', '1999')
    expect(readTheme()).toBe('2015')
  })

  it('setTheme menyimpan dan memasang atribut; kembali ke 2015 menghapusnya', () => {
    setTheme('2010')
    expect(localStorage.getItem('rb.theme')).toBe('2010')
    expect(document.documentElement.getAttribute('data-theme')).toBe('2010')
    expect(readTheme()).toBe('2010')
    applyTheme('2015')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })
})
