import { GroupPrivacy } from '@prisma/client'
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator'

export class CreateGroupDto {
  @IsString()
  @MaxLength(80)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @IsOptional()
  @IsEnum(GroupPrivacy)
  privacy?: GroupPrivacy
}

export class CreateGroupPostDto {
  @IsString()
  @MaxLength(5000)
  content!: string

  @IsOptional()
  @Matches(/^\/uploads\/[0-9a-f]{32}\.(jpg|png|webp)$/)
  imageUrl?: string | null
}
