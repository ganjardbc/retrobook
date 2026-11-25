import { Transform } from 'class-transformer'
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

export class CreateBotDto {
  @Matches(/^[A-Za-z0-9._]{3,30}$/)
  username!: string

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName!: string

  /** Topik dipisah koma, mis. "coffee, music". */
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  persona!: string

  @IsInt()
  @Min(1)
  @Max(24)
  postsPerDay = 2
}

export class UpdateBotDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  persona?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  postsPerDay?: number
}
