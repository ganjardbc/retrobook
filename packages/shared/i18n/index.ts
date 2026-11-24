import { en } from './en'

export type MessageKey = keyof typeof en

/** t('home.welcome', { name: 'Budi' }) -> "Welcome, Budi!" */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const text: string = en[key]
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`))
}
