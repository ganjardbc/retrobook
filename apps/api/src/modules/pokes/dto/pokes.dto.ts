import { IsUUID } from 'class-validator'

export class PokeDto {
  @IsUUID('4')
  userId!: string
}
