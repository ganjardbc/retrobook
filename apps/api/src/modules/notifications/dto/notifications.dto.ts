import { ArrayMaxSize, IsArray, IsOptional, IsUUID } from 'class-validator'

export class MarkReadDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids?: string[]
}
