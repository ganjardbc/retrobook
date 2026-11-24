import { IsString, MaxLength } from 'class-validator'

export class CreateCommentDto {
  @IsString()
  @MaxLength(2000, { message: 'Komentar maksimal 2.000 karakter' })
  content!: string
}
