// Objek bersama antara API dan frontend (docs/04-api-spec.md 1.3).
import type { Privacy, ReportReason, ReportTargetType } from './enums'

export type UserSummary = {
  id: number
  username: string
  displayName: string
  avatarUrl: string | null
  isBot: boolean
}

/**
 * Post asal yang disematkan pada share (POST-07). Hanya isi yang perlu ditampilkan: jumlah like dan
 * komentar milik share itu sendiri, bukan milik post asal.
 */
export type SharedPost = {
  id: number
  author: UserSummary
  content: string
  imageUrl: string | null
  createdAt: string
}

export type Post = {
  id: number
  groupId?: number | null
  author: UserSummary
  wallOwner: UserSummary | null
  /**
   * null bila bukan share. `{ unavailable: true }` bila post asal dihapus, disembunyikan, atau tidak boleh
   * dilihat pembaca ini (aturan visibilitas dicek saat dibaca, bukan saat dibagikan).
   */
  sharedFrom: SharedPost | { unavailable: true } | null
  content: string
  imageUrl: string | null
  feeling: string | null
  privacy: Privacy
  tags: UserSummary[]
  likeCount: number
  commentCount: number
  likedByMe: boolean
  savedByMe: boolean
  /** Sampai 2 nama untuk "A, B, and 3 others like this". */
  likedPreview: UserSummary[]
  editedAt: string | null
  createdAt: string
}

export type GroupPrivacy = 'PUBLIC' | 'CLOSED'
export type GroupSummary = {
  id: number
  name: string
  description: string
  privacy: GroupPrivacy
  avatarUrl: string | null
  createdBy: number
  createdAt: string
  memberCount: number
  isMember: boolean
  /** Viewer adalah admin grup (boleh edit dan ganti foto). */
  isAdmin: boolean
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

/** YIR-01: ringkasan satu tahun milik sendiri; `years` = tahun yang punya post (terbaru dulu). */
export type YearInReview = {
  year: number
  years: number[]
  postCount: number
  photoCount: number
  likeCount: number
  commentCount: number
  topPost: Post | null
}

export type Paged<T> = { items: T[]; nextCursor: number | null }

/** Satu foto pada tab Photos: gambar dari post yang boleh dilihat pembaca (post asal untuk tautan). */
export type ProfilePhoto = { postId: number; url: string; createdAt: string }

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
  profileInfoVisible?: boolean
  friendsVisible?: boolean
  relationship: Relationship
  createdAt: string
}

/** Permintaan pertemanan masuk (GET /friends/requests). */
/** Notifikasi dari API (`GET /notifications` dan event `notification:new`). */
export type AppNotification = {
  id: number
  type:
    | 'LIKE'
    | 'COMMENT'
    | 'FRIEND_REQUEST'
    | 'FRIEND_ACCEPT'
    | 'POKE'
    | 'TAG'
    | 'WALL_POST'
    | 'ANNOUNCEMENT'
  actor: UserSummary | null
  postId: number | null
  commentId: number | null
  announcementId?: number | null
  text: string
  readAt: string | null
  createdAt: string
}

/** Pesan chat 1-ke-1 (`/messages` dan event `message:new`). */
export type ChatMessage = {
  id: number
  senderId: number
  receiverId: number
  content: string
  readAt: string | null
  createdAt: string
}

/** Teman di sidebar chat (`GET /chat/friends`); `client` terisi bila online. */
export type ChatFriend = {
  user: UserSummary
  online: boolean
  client: 'WEB' | 'MOBILE' | null
  /** Terakhir terlihat (ISO); dipakai untuk label "24m" pada teman offline. */
  lastSeenAt: string | null
  unreadCount: number
}

/** Satu baris daftar percakapan (`GET /messages/conversations`). */
export type Conversation = { user: UserSummary; lastMessage: ChatMessage; unreadCount: number }

/** Satu baris trending (`GET /trending`): hashtag dan jumlah post publik 24 jam terakhir. */
export type TrendingTag = { tag: string; count: number }

/** Tanda terima `POST /reports` (INT-04). */
export type ReportReceipt = {
  id: number
  targetType: ReportTargetType
  targetId: number
  reason: ReportReason
  createdAt: string
}

/** Poke aktif yang diterima (`GET /pokes`). */
export type PokeItem = { user: UserSummary; createdAt: string }

/** People You May Know (`GET /friends/suggestions`). */
export type FriendSuggestion = { user: UserSummary; mutualFriends: number }

export type FriendRequest = { user: UserSummary; createdAt: string }

/** Daftar teman: Paged biasa ditambah jumlah total (tab Friends menampilkan jumlah, FRD-04). */
export type FriendsPage = Paged<UserSummary> & { total: number }

export type FriendshipResult = { userId: number; status: 'PENDING' | 'ACCEPTED' }

export type AuthSession = {
  user: Pick<UserSummary, 'id' | 'username' | 'displayName'> & { avatarUrl?: string | null }
  accessToken: string
  refreshToken: string
}
