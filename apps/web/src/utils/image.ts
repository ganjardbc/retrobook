import type { MessageKey } from '@retrobook/shared/i18n'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Pemeriksaan cepat di klien supaya umpan balik tidak menunggu jaringan. Yang menentukan tetap
 * server (isi berkas diperiksa di sana). Mengembalikan kunci pesan galat, atau null bila lolos.
 */
export function imageProblem(file: File): MessageKey | null {
  if (!TYPES.includes(file.type)) return 'upload.error.type'
  if (file.size > MAX_IMAGE_BYTES) return 'upload.error.size'
  return null
}
