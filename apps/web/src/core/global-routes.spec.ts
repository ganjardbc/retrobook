import { describe, expect, it } from 'vitest'
import { router, safeRedirect } from '@/core/global-routes'

const name = (path: string) => router.resolve(path).name

describe('global-routes', () => {
  it('rute statis menang atas /:username, apa pun urutan glob', () => {
    expect(name('/')).toBe('home')
    expect(name('/friends')).toBe('friends')
    expect(name('/me/edit')).toBe('profile-edit')
    expect(name('/login')).toBe('login')
    expect(name('/privacy')).toBe('privacy')
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
})
