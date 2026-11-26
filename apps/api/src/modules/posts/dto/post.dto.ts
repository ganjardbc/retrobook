import { Privacy } from '@prisma/client'
import { FEED_SORTS, POST_FEELINGS, type FeedSort } from '@retrobook/shared'
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
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

// Hanya URL hasil POST /uploads/post-image yang diterima; URL luar (atau javascript:) ditolak.
export const UPLOAD_URL = /^\/uploads\/[0-9a-f]{32}\.(jpg|png|webp)$/

export class UpdatePostDto {
  @IsOptional()
  @IsIn(POST_FEELINGS, { message: 'Feeling is not available' })
  feeling?: (typeof POST_FEELINGS)[number] | null

  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Post must be at most 5,000 characters' })
  content?: string

  @IsOptional()
  @Matches(UPLOAD_URL, { message: 'imageUrl must come from an upload' })
  imageUrl?: string | null

  @IsOptional()
  @IsEnum(Privacy, { message: 'Privacy must be PUBLIC, FRIENDS, or ONLY_ME' })
  privacy?: Privacy
}

/** POST /posts. Dinding dan tag hanya ditentukan saat membuat; edit tidak mengubahnya. */
export class CreatePostDto extends UpdatePostDto {
  @IsOptional()
  @IsUUID('4')
  groupId?: string
  /** WAL-01: tulis di dinding teman (BR-04). */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  wallOwnerUsername?: string | null

  /** WAL-02: teman yang di-tag (maksimal 10). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'At most 10 friends can be tagged' })
  @ArrayUnique()
  @IsUUID('4', { each: true })
  taggedUserIds?: string[]
}

/** POST /posts/:id/share: komentar sendiri opsional; foto tidak ada karena isinya post asal. */
export class SharePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'Post must be at most 5,000 characters' })
  content?: string

  @IsOptional()
  @IsEnum(Privacy, { message: 'Privacy must be PUBLIC, FRIENDS, or ONLY_ME' })
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
  @IsUUID('4')
  cursor?: string
}

/** GET /feed: `sort=recent` (bawaan) atau `sort=top` (Top Stories, urut jumlah like; POST-09). */
export class FeedQueryDto extends CursorQueryDto {
  @IsOptional()
  @IsIn(FEED_SORTS, { message: 'sort must be recent or top' })
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

export class YearQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2004)
  @Max(2100)
  year?: number
}
