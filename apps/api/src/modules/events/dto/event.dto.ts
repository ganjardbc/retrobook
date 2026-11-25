import { RsvpStatus } from '@prisma/client'
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateEventDto {
  @IsString() @MaxLength(120) title!: string
  @IsOptional() @IsString() @MaxLength(3000) description?: string
  @IsOptional() @IsString() @MaxLength(120) location?: string
  @IsDateString() startsAt!: string
}

export class RsvpDto {
  @IsEnum(RsvpStatus) status!: RsvpStatus
}
