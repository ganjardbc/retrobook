export type ModerationFilter = '' | 'hidden' | 'reported' | 'deleted'
export type ModerationResource = 'posts' | 'comments'
export type ModerationAction = 'hide' | 'show' | 'delete'
export type ModerationAuthor = { id: number; username: string; displayName: string; avatarUrl: string | null }
export type ModerationReports = { total: number; pending: number }
export type ModerationPost = {
  id: number; content: string; imageUrl: string | null; hidden: boolean; createdAt: string; deletedAt: string | null
  author: ModerationAuthor; reports: ModerationReports; _count: { comments: number }
}
export type ModerationComment = {
  id: number; content: string; imageUrl: string | null; hidden: boolean; createdAt: string; deletedAt: string | null
  author: ModerationAuthor; reports: ModerationReports
  post: { id: number; content: string; author: { username: string; displayName: string } }
}
export type ModerationItem = ModerationPost | ModerationComment
export type ModerationPage = { items: ModerationItem[]; total: number; nextCursor: number | null }
export type ModerationQuery = { resource: ModerationResource; filter: ModerationFilter; q: string; from: string; to: string; cursor: number | null }
