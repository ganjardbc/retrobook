import { THEMES, type Theme } from '@retrobook/shared'

const KEY = 'rb.theme'
export const DEFAULT_THEME: Theme = '2015'

export function readTheme(): Theme {
  try {
    const value = localStorage.getItem(KEY)
    return THEMES.includes(value as Theme) ? (value as Theme) : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

/** Pasang tema pada <html>; tema bawaan tidak memberi atribut sehingga token :root berlaku apa adanya. */
export function applyTheme(theme: Theme) {
  if (theme === DEFAULT_THEME) document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // penyimpanan diblokir: tema tetap berlaku untuk sesi ini
  }
  applyTheme(theme)
}
