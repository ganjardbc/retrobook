import { Transform, Type } from 'class-transformer'
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export class AdminHashtagsQuery {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().replace(/^#/, '').toLowerCase() : value,
  )
  @IsString()
  @MaxLength(50)
  q?: string

  @IsOptional() @IsUUID('4') cursor?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 30
}

export class SetHashtagHiddenDto {
  @IsBoolean() hidden!: boolean
}
