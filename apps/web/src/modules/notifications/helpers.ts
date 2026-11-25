import type { AppNotification } from '@retrobook/shared'

/** Tujuan satu notifikasi: post bila ada, selain itu halaman yang relevan. */
export function notificationTarget(n: AppNotification, selfUsername?: string): string {
  if (n.postId) return `/posts/${n.postId}`
  if (n.type === 'POKE') return '/pokes'
  if (n.type === 'FRIEND_REQUEST') return '/friends'
  if (n.type === 'WALL_POST' && selfUsername) return `/${selfUsername}`
  return n.actor ? `/${n.actor.username}` : '/'
}
