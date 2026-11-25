import { Transform, Type } from 'class-transformer'
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator'
import { CursorQueryDto } from '../../posts/dto/post.dto'

export class SendRequestDto {
  @IsUUID('4')
  userId!: string
}

export class FriendsQueryDto extends CursorQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  q?: string
}

export class SuggestionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit: number = 5
}

/** Tanggal kalender di zona pengguna (klien yang tahu "hari ini"-nya); bawaan hari ini UTC. */
export class BirthdaysQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date harus berformat YYYY-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'date bukan tanggal kalender yang valid' })
  date?: string
}
