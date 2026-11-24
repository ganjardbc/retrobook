import type { ReportReason, ReportReceipt, ReportTargetType } from '@retrobook/shared'
import { request } from '@/plugins/http'

export const reportsApi = {
  /** INT-04: laporkan post, komentar, atau profil. 409 ALREADY_REPORTED bila sudah pernah. */
  create: (input: {
    targetType: ReportTargetType
    targetId: number
    reason: ReportReason
    note?: string
  }) => request<ReportReceipt>('/reports', { method: 'POST', body: input }),
}
