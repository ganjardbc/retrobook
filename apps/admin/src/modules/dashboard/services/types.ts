export type DashboardStats = {
  totalUsers: number
  totalPosts: number
  totalComments: number
  activeUsersToday: number
  newUsersLast7Days: number
  pendingReports: number
  registrationsByDay: DailyCount[]
  postsByDay: DailyCount[]
}

export type DailyCount = { date: string; count: number }
