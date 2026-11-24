export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED'
export type UserRole = 'USER' | 'ADMIN'

export type AdminUser = {
  id: number
  username: string
  displayName: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: string
}

export type UserListFilters = { status: UserStatus | ''; role: UserRole | '' }
