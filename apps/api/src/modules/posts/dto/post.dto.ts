import { Privacy } from '@prisma/client'
import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator'

// Hanya URL hasil POST /uploads/post-image yang diterima; URL luar (atau javascript:) ditolak.
export const UPLOAD_URL = /^\/uploads\/[0-9a-f]{32}\.(jpg|png|webp)$/

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Post maksimal 5.000 karakter' })
  content?: string

  @IsOptional()
  @Matches(UPLOAD_URL, { message: 'imageUrl harus berasal dari unggahan' })
  imageUrl?: string | null

  @IsOptional()
  @IsEnum(Privacy, { message: 'Privasi harus PUBLIC, FRIENDS, atau ONLY_ME' })
  privacy?: Privacy
}

export class UpdatePostDto extends CreatePostDto {}

/** POST /posts/:id/share: komentar sendiri opsional; foto tidak ada karena isinya post asal. */
export class SharePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Post maksimal 5.000 karakter' })
  content?: string

  @IsOptional()
  @IsEnum(Privacy, { message: 'Privasi harus PUBLIC, FRIENDS, atau ONLY_ME' })
  privacy?: Privacy
}

export class CursorQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cursor?: number
}
