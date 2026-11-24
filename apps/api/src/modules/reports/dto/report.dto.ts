import { ReportReason, ReportTargetType } from '@prisma/client'
import { Transform, Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

/** POST /reports (INT-04). Field lain ditolak oleh whitelist. */
export class CreateReportDto {
  @IsEnum(ReportTargetType, { message: 'targetType harus POST, COMMENT, atau USER' })
  targetType!: ReportTargetType

  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetId!: number

  @IsEnum(ReportReason, { message: 'reason harus SPAM, HARASSMENT, INAPPROPRIATE, atau OTHER' })
  reason!: ReportReason

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500, { message: 'Catatan maksimal 500 karakter' })
  note?: string
}
