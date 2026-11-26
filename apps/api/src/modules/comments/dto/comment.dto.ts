import { IsOptional, IsString, Matches, MaxLength } from 'class-validator'
import { UPLOAD_URL } from '../../posts/dto/post.dto'

export class CreateCommentDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Comment must be at most 2,000 characters' })
  content?: string

  @IsOptional()
  @Matches(UPLOAD_URL, { message: 'imageUrl must come from an upload' })
  imageUrl?: string | null
}
