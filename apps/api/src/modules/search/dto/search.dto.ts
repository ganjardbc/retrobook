import { Transform, Type } from 'class-transformer'
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

export class SearchQueryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2, { message: 'Search query must be at least 2 characters' })
  @MaxLength(80)
  q!: string

  /** Dropdown navbar memakai 8 (SRC-01); halaman hasil boleh lebih. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 8

  @IsOptional()
  @IsUUID('4')
  cursor?: string
}
