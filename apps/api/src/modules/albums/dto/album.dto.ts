import { Privacy } from '@prisma/client'
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateAlbumDto {
  @IsString() @MinLength(1) @MaxLength(80) name!: string
  @IsOptional() @IsEnum(Privacy) privacy?: Privacy
}
