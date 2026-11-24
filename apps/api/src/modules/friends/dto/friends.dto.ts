import { Transform, Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'
import { CursorQueryDto } from '../../posts/dto/post.dto'

export class SendRequestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId!: number
}

export class FriendsQueryDto extends CursorQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  q?: string
}
