import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsInt, IsOptional, Min } from 'class-validator'

export class MarkReadDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  ids?: number[]
}
