import { en } from './en'
import { id } from './id'

export type MessageKey = keyof typeof en
export type Locale = 'en' | 'id'

export const LOCALES: readonly Locale[] = ['en', 'id']
export const DEFAULT_LOCALE: Locale = 'en'

const dictionaries: Record<Locale, Record<MessageKey, string>> = { en, id }
const INTL: Record<Locale, string> = { en: 'en-US', id: 'id-ID' }

let current: Locale = DEFAULT_LOCALE
// Aplikasi Vue memasang pembaca reaktif (ref) di sini supaya t() di dalam render memicu render ulang saat bahasa berganti.
let read: () => Locale = () => current
const listeners = new Set<(l: Locale) => void>()

export const isLocale = (v: unknown): v is Locale => v === 'en' || v === 'id'

export function getLocale(): Locale {
  return read()
}

export function setLocale(locale: Locale): void {
  if (current === locale) return
  current = locale
  listeners.forEach((fn) => fn(locale))
}

/** Dengar perubahan bahasa; mengembalikan fungsi untuk berhenti. */
export function onLocaleChange(fn: (l: Locale) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Ganti pembaca bahasa aktif (mis. `() => localeRef.value`). */
export function bindLocaleReader(fn: () => Locale): void {
  read = fn
}

/** Nama bahasa dalam bahasanya sendiri, untuk pemilih bahasa. */
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', id: 'Bahasa Indonesia' }

/**
 * Baca bahasa tersimpan (localStorage), pasang, lalu simpan dan tandai <html lang> setiap kali berganti.
 * Panggil sekali saat aplikasi mulai, sebelum mount.
 */
export function initLocale(storageKey: string): Locale {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(storageKey)
  } catch {
    /* penyimpanan diblokir: pakai bawaan */
  }
  const apply = (l: Locale) => {
    if (typeof document !== 'undefined') document.documentElement.lang = l
  }
  onLocaleChange((l) => {
    apply(l)
    try {
      localStorage.setItem(storageKey, l)
    } catch {
      /* abaikan */
    }
  })
  const initial = isLocale(stored) ? stored : DEFAULT_LOCALE
  setLocale(initial)
  apply(initial)
  return initial
}

/** Kode BCP 47 untuk Intl / toLocale*String pada bahasa aktif. */
export const intlLocale = (): string => INTL[read()]

/** t('home.welcome', { name: 'Budi' }) -> "Welcome, Budi!" */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const text = dictionaries[read()][key] ?? en[key]
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`))
}
