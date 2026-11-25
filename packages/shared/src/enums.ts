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

export const REPORT_TARGET_TYPES = ['POST', 'COMMENT', 'USER'] as const
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number]

export const REPORT_REASONS = ['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'OTHER'] as const
export type ReportReason = (typeof REPORT_REASONS)[number]

/** Urutan News Feed (POST-09): terbaru, atau Top Stories (jumlah like). */
export const FEED_SORTS = ['recent', 'top'] as const
export type FeedSort = (typeof FEED_SORTS)[number]

/** Pilihan tetap untuk perasaan pada post (POST-08). */
export const POST_FEELINGS = [
  'feeling happy',
  'feeling grateful',
  'feeling excited',
  'feeling nostalgic',
  'feeling tired',
  'feeling loved',
  'feeling hopeful',
  'feeling silly',
] as const
export type PostFeeling = (typeof POST_FEELINGS)[number]

/** Tema Time Travel (THM-01); '2015' adalah tema bawaan di :root. */
export const THEMES = ['2010', '2015', '2020'] as const
export type Theme = (typeof THEMES)[number]
