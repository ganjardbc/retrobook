import { Privacy } from '@prisma/client'
import { IsEnum } from 'class-validator'

export class UpdatePrivacyDto {
  @IsEnum(Privacy) profileInfoPrivacy!: Privacy
  @IsEnum(Privacy) friendsPrivacy!: Privacy
  @IsEnum(Privacy) defaultPostPrivacy!: Privacy
}
