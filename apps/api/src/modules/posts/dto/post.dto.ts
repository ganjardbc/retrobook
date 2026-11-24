import { Privacy } from '@prisma/client'
import { FEED_SORTS, type FeedSort } from '@retrobook/shared'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

// Hanya URL hasil POST /uploads/post-image yang diterima; URL luar (atau javascript:) ditolak.
export const UPLOAD_URL = /^\/uploads\/[0-9a-f]{32}\.(jpg|png|webp)$/

export class UpdatePostDto {
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

/** POST /posts. Dinding dan tag hanya ditentukan saat membuat; edit tidak mengubahnya. */
export class CreatePostDto extends UpdatePostDto {
  /** WAL-01: tulis di dinding teman (BR-04). */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  wallOwnerUsername?: string | null

  /** WAL-02: teman yang di-tag (maksimal 10). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'Maksimal 10 teman yang di-tag' })
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  taggedUserIds?: number[]
}

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

/** GET /feed: `sort=recent` (bawaan) atau `sort=top` (Top Stories, urut jumlah like; POST-09). */
export class FeedQueryDto extends CursorQueryDto {
  @IsOptional()
  @IsIn(FEED_SORTS, { message: 'sort harus recent atau top' })
  sort: FeedSort = 'recent'
}

/** GET /users/:username/posts: `year` (UTC) menyaring timeline ke satu tahun (scroller tahun, PRF-05). */
export class TimelineQueryDto extends CursorQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(2100)
  year?: number
}
