import { IsOptional, IsString, Matches, MaxLength } from 'class-validator'

export const MAX_MESSAGE_LENGTH = 2000

export class SendMessageDto {
  @IsString()
  @MaxLength(MAX_MESSAGE_LENGTH, { message: 'Message must be at most 2,000 characters' })
  content!: string

  /** Dibuat klien; mengirim ulang dengan clientId sama tidak membuat pesan ganda. */
  @IsOptional()
  @Matches(/^[\w-]{1,64}$/, { message: 'Invalid clientId' })
  clientId?: string
}
