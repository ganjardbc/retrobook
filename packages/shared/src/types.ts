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

/** Hubungan pemanggil dengan pemilik profil (docs/04-api-spec.md bagian 3). */
export type Relationship = 'SELF' | 'FRIENDS' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'NONE'

/** GET /users/:username. Tanpa email, role, atau status akun. `birthday` berformat YYYY-MM-DD. */
export type Profile = UserSummary & {
  coverUrl: string | null
  bio: string | null
  birthday: string | null
  hometown: string | null
  currentCity: string | null
  workplace: string | null
  school: string | null
  friendCount: number
  relationship: Relationship
  createdAt: string
}

/** Permintaan pertemanan masuk (GET /friends/requests). */
export type FriendRequest = { user: UserSummary; createdAt: string }

/** Daftar teman: Paged biasa ditambah jumlah total (tab Friends menampilkan jumlah, FRD-04). */
export type FriendsPage = Paged<UserSummary> & { total: number }

export type FriendshipResult = { userId: number; status: 'PENDING' | 'ACCEPTED' }

export type AuthSession = {
  user: Pick<UserSummary, 'id' | 'username' | 'displayName'> & { avatarUrl?: string | null }
  accessToken: string
  refreshToken: string
}
