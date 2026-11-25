import { Transform } from 'class-transformer'
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)
// Hanya tautan http(s) atau path internal: skema lain (javascript:, data:) ditolak karena dirender sebagai href.
const SAFE_LINK = /^(https?:\/\/[^\s]+|\/[^\s/][^\s]*)$/

export class CreateSponsoredDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) title!: string
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(500) body!: string
  @Transform(trim) @Matches(SAFE_LINK) @MaxLength(255) linkUrl!: string

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Transform(trim)
  @Matches(SAFE_LINK)
  @MaxLength(255)
  imageUrl?: string | null

  @IsOptional() @IsBoolean() active?: boolean
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString() startsAt?: string | null
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString() endsAt?: string | null
}

export class UpdateSponsoredDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) title?: string
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(500) body?: string
  @IsOptional() @Transform(trim) @Matches(SAFE_LINK) @MaxLength(255) linkUrl?: string

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Transform(trim)
  @Matches(SAFE_LINK)
  @MaxLength(255)
  imageUrl?: string | null

  @IsOptional() @IsBoolean() active?: boolean
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString() startsAt?: string | null
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString() endsAt?: string | null
}
