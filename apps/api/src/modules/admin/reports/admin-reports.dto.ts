import { Type } from 'class-transformer'
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
import { ReportStatus } from '@prisma/client'

export enum AdminReportAction {
  HIDE_CONTENT = 'HIDE_CONTENT',
  DELETE_CONTENT = 'DELETE_CONTENT',
  SUSPEND_USER = 'SUSPEND_USER',
}

export class AdminReportsQuery {
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cursor?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20
}

export class DecideReportDto {
  @IsIn([ReportStatus.REVIEWED, ReportStatus.DISMISSED])
  status!: 'REVIEWED' | 'DISMISSED'

  @IsOptional()
  @IsEnum(AdminReportAction)
  action?: AdminReportAction

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
