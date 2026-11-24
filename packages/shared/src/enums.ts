// Nilai enum sama dengan enum Prisma (packages/db/prisma/schema.prisma).
export const ROLES = ['USER', 'ADMIN'] as const
export type Role = (typeof ROLES)[number]

export const USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'BANNED'] as const
export type UserStatus = (typeof USER_STATUSES)[number]

export const PRIVACIES = ['PUBLIC', 'FRIENDS', 'ONLY_ME'] as const
export type Privacy = (typeof PRIVACIES)[number]

export const FRIEND_STATUSES = ['PENDING', 'ACCEPTED'] as const
export type FriendStatus = (typeof FRIEND_STATUSES)[number]

export const NOTIF_TYPES = [
  'LIKE',
  'COMMENT',
  'FRIEND_REQUEST',
  'FRIEND_ACCEPT',
  'POKE',
  'TAG',
  'WALL_POST',
  'ANNOUNCEMENT',
] as const
export type NotifType = (typeof NOTIF_TYPES)[number]
