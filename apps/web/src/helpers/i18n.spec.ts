import { describe, expect, it } from 'vitest'
import { en } from '../../../../packages/shared/i18n/en'
import { id } from '../../../../packages/shared/i18n/id'
import { getLocale, intlLocale, setLocale, t } from '@retrobook/shared/i18n'

describe('i18n', () => {
  it('Inggris bawaan; id punya kunci yang sama dengan en dan tidak ada nilai kosong', () => {
    expect(getLocale()).toBe('en')
    expect(Object.keys(id).sort()).toEqual(Object.keys(en).sort())
    expect(Object.entries(id).filter(([, v]) => !v)).toEqual([])
  })

  it('placeholder {param} sama di kedua bahasa', () => {
    const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const k of Object.keys(en) as (keyof typeof en)[]) {
      expect(params(id[k]), k).toEqual(params(en[k]))
    }
  })

  it('t() mengikuti bahasa aktif dan isi parameter', () => {
    setLocale('id')
    expect(t('common.logOut')).toBe('Keluar')
    expect(t('chat.typing', { name: 'Budi' })).toBe('Budi sedang mengetik...')
    expect(intlLocale()).toBe('id-ID')
    setLocale('en')
    expect(t('common.logOut')).toBe('Log Out')
    expect(intlLocale()).toBe('en-US')
  })
})
