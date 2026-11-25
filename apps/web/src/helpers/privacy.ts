import type { Privacy } from '@retrobook/shared'

/** Ikon privasi (bola dunia, dua orang, gembok) yang dipakai selektor privasi. */
export const PRIVACY_ICONS: Record<Privacy, string> = {
  PUBLIC: 'mdi:earth',
  FRIENDS: 'mdi:account-multiple',
  ONLY_ME: 'mdi:lock',
}
