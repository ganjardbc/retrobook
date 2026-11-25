export type ReportStatus = 'PENDING' | 'REVIEWED' | 'DISMISSED'
export type ReportAction = 'HIDE_CONTENT' | 'DELETE_CONTENT' | 'SUSPEND_USER'
export type ReportPerson = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}
export type ReportTarget =
  | {
      id: string
      content: string
      imageUrl: string | null
      hidden: boolean
      deletedAt: string | null
      author: ReportPerson
    }
  | (ReportPerson & { status: string })
export type AdminReport = {
  id: string
  targetType: 'POST' | 'COMMENT' | 'USER'
  targetId: string
  reason: 'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE' | 'OTHER'
  note: string | null
  status: ReportStatus
  handledAt: string | null
  createdAt: string
  reporter: ReportPerson
  target: ReportTarget | null
}
export type ReportsPage = { items: AdminReport[]; total: number; nextCursor: string | null }
