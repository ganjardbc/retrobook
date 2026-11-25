import { IsOptional, IsString, Matches, MaxLength } from 'class-validator'
import { UPLOAD_URL } from '../../posts/dto/post.dto'

export class CreateCommentDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Komentar maksimal 2.000 karakter' })
  content?: string

  @IsOptional()
  @Matches(UPLOAD_URL, { message: 'imageUrl harus berasal dari unggahan' })
  imageUrl?: string | null
}
