export type ModerationFilter = '' | 'hidden' | 'reported' | 'deleted' | 'flagged'
export type ModerationResource = 'posts' | 'comments'
export type ModerationAction = 'hide' | 'show' | 'delete'
export type ModerationAuthor = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}
export type ModerationReports = { total: number; pending: number }
export type ModerationPost = {
  id: string
  content: string
  imageUrl: string | null
  hidden: boolean
  flagged: boolean
  createdAt: string
  deletedAt: string | null
  author: ModerationAuthor
  reports: ModerationReports
  _count: { comments: number }
}
export type ModerationComment = {
  id: string
  content: string
  imageUrl: string | null
  hidden: boolean
  flagged: boolean
  createdAt: string
  deletedAt: string | null
  author: ModerationAuthor
  reports: ModerationReports
  post: { id: string; content: string; author: { username: string; displayName: string } }
}
export type ModerationItem = ModerationPost | ModerationComment
export type ModerationPage = { items: ModerationItem[]; total: number; nextCursor: string | null }
export type ModerationQuery = {
  resource: ModerationResource
  filter: ModerationFilter
  q: string
  from: string
  to: string
  cursor: string | null
}
