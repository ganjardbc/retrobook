import type { AppNotification } from '@retrobook/shared'
import { describe, expect, it } from 'vitest'
import { notificationTarget } from './helpers'

const n = (over: Partial<AppNotification>) =>
  ({ id: 1, type: 'LIKE', actor: null, postId: null, ...over }) as AppNotification

describe('notificationTarget', () => {
  it('post → detail, lainnya → halaman relevan', () => {
    expect(notificationTarget(n({ postId: 7 }))).toBe('/posts/7')
    expect(notificationTarget(n({ type: 'POKE' }))).toBe('/pokes')
    expect(notificationTarget(n({ type: 'FRIEND_REQUEST' }))).toBe('/friends')
    expect(notificationTarget(n({ type: 'ANNOUNCEMENT' }))).toBe('/')
  })
})
