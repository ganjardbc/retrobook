import { LifeEventKind, Privacy } from '@prisma/client'
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateLifeEventDto {
  @IsEnum(LifeEventKind) kind!: LifeEventKind
  @IsString() @MaxLength(120) title!: string
  @IsDateString() happenedOn!: string
  @IsOptional() @IsEnum(Privacy) privacy?: Privacy
}
