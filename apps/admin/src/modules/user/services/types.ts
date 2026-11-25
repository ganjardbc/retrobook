export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED'
export type UserRole = 'USER' | 'ADMIN'

export type AdminUser = {
  id: string
  username: string
  displayName: string
  email: string
  role: UserRole
  status: UserStatus
  isBot: boolean
  createdAt: string
}

export type AdminUserDetail = AdminUser & {
  lastSeenAt: string | null
  postCount: number
  commentCount: number
  reportCount: number
}

export type AdminUsersPage = { items: AdminUser[]; total: number; nextCursor: string | null }

export type UserListFilters = { status: UserStatus | ''; role: UserRole | '' }
