// Objek bersama antara API dan frontend (docs/04-api-spec.md 1.3).
import type { Privacy } from './enums'

export type UserSummary = {
  id: number
  username: string
  displayName: string
  avatarUrl: string | null
  isBot: boolean
}

export type Post = {
  id: number
  author: UserSummary
  wallOwner: UserSummary | null
  /** null bila bukan share; { unavailable: true } bila post asal dihapus. */
  sharedFrom: Post | { unavailable: true } | null
  content: string
  imageUrl: string | null
  feeling: string | null
  privacy: Privacy
  tags: UserSummary[]
  likeCount: number
  commentCount: number
  likedByMe: boolean
  /** Sampai 2 nama untuk "A, B, and 3 others like this". */
  likedPreview: UserSummary[]
  editedAt: string | null
  createdAt: string
}

export type Comment = {
  id: number
  postId: number
  author: UserSummary
  content: string
  imageUrl: string | null
  likeCount: number
  likedByMe: boolean
  createdAt: string
}

export type Paged<T> = { items: T[]; nextCursor: number | null }

export type AuthSession = {
  user: Pick<UserSummary, 'id' | 'username' | 'displayName'>
  accessToken: string
  refreshToken: string
}
