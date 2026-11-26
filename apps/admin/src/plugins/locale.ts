import { shallowRef } from 'vue'
import { bindLocaleReader, initLocale, onLocaleChange } from '@retrobook/shared/i18n'

/**
 * Bahasa antarmuka (D-2: Inggris bawaan, Indonesia opsional). `t()` membaca ref ini di dalam render,
 * jadi mengganti bahasa langsung merender ulang semua teks.
 */
export function setupLocale(): void {
  const locale = shallowRef(initLocale('rb.admin.locale'))
  onLocaleChange((l) => (locale.value = l))
  bindLocaleReader(() => locale.value)
}
