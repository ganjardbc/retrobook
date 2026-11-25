import { ReportReason, ReportTargetType } from '@prisma/client'
import { Transform } from 'class-transformer'
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'

/** POST /reports (INT-04). Field lain ditolak oleh whitelist. */
export class CreateReportDto {
  @IsEnum(ReportTargetType, { message: 'targetType harus POST, COMMENT, atau USER' })
  targetType!: ReportTargetType

  @IsUUID('4')
  targetId!: string

  @IsEnum(ReportReason, { message: 'reason harus SPAM, HARASSMENT, INAPPROPRIATE, atau OTHER' })
  reason!: ReportReason

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500, { message: 'Catatan maksimal 500 karakter' })
  note?: string
}
