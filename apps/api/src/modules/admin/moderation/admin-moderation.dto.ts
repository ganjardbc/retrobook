import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ArrayMaxSize, ArrayMinSize, ArrayUnique } from 'class-validator'

export enum AdminModerationFilter {
  HIDDEN = 'hidden',
  REPORTED = 'reported',
  DELETED = 'deleted',
  FLAGGED = 'flagged',
}

export class AdminModerationQuery {
  @IsOptional()
  @IsEnum(AdminModerationFilter)
  filter?: AdminModerationFilter

  @IsOptional()
  @IsString()
  @MaxLength(191)
  q?: string

  @IsOptional()
  @IsDateString()
  from?: string

  @IsOptional()
  @IsDateString()
  to?: string

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

export class SetModerationHiddenDto {
  @IsBoolean()
  hidden!: boolean
}

export enum AdminModerationBulkAction {
  HIDE = 'hide',
  SHOW = 'show',
  DELETE = 'delete',
}

export class BulkModerationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @ArrayMaxSize(100)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  ids!: number[]

  @IsEnum(AdminModerationBulkAction)
  action!: AdminModerationBulkAction

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string
}
