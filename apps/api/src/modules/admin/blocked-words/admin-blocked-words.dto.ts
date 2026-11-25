import { Transform } from 'class-transformer'
import { IsString, MaxLength, MinLength } from 'class-validator'

export class CreateBlockedWordDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  word!: string
}
