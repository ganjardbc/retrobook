import { describe, expect, it } from 'vitest'
import { router, safeRedirect, scrollBehavior } from '@/core/global-routes'

const name = (path: string) => router.resolve(path).name

describe('global-routes', () => {
  it('rute statis menang atas /:username, apa pun urutan glob', () => {
    expect(name('/')).toBe('home')
    expect(name('/friends')).toBe('friends')
    expect(name('/me/edit')).toBe('profile-edit')
    expect(name('/login')).toBe('login')
    expect(name('/privacy')).toBe('privacy')
    expect(name('/pokes')).toBe('pokes')
    expect(name('/search')).toBe('search')
  })

  it('username jatuh ke profil dan tab-nya; sisanya 404', () => {
    expect(name('/alice')).toBe('profile')
    expect(name('/alice/photos')).toBe('profile-photos')
    expect(name('/alice/nope/deep')).toBe('not-found')
  })

  it('safeRedirect menolak open redirect', () => {
    expect(safeRedirect('//evil.com')).toBe('/')
    expect(safeRedirect('/friends')).toBe('/friends')
  })

  it('scroll: detail post mulai dari atas; Back/Forward memulihkan posisi; rute lain tidak diubah', () => {
    const at = (path: string) => router.resolve(path)
    const detail = at('/posts/11111111-1111-4111-8111-111111111111')
    const other = at('/posts/22222222-2222-4222-8222-222222222222')
    expect(scrollBehavior(detail, at('/'), null)).toEqual({ top: 0 })
    expect(scrollBehavior(other, detail, null)).toEqual({ top: 0 }) // pindah lewat daftar related
    expect(scrollBehavior(detail, at('/'), { left: 0, top: 480 })).toEqual({ left: 0, top: 480 })
    expect(scrollBehavior(at('/friends'), at('/'), null)).toBeUndefined()
  })
})
