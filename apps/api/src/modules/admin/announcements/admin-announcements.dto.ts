import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

export class CreateAnnouncementDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body!: string
}

export class UpdateAnnouncementDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body?: string

  @IsOptional()
  @IsBoolean()
  active?: boolean
}
