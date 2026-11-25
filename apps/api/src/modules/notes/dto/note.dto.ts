import { Privacy } from '@prisma/client'
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateNoteDto {
  @IsString() @MinLength(1) @MaxLength(120) title!: string
  @IsString() @MinLength(1) @MaxLength(20000) body!: string
  @IsOptional() @IsEnum(Privacy) privacy?: Privacy
}

export class UpdateNoteDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(120) title?: string
  @IsOptional() @IsString() @MinLength(1) @MaxLength(20000) body?: string
  @IsOptional() @IsEnum(Privacy) privacy?: Privacy
}
