import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC = 'isPublic'
/** Menandai endpoint yang tidak butuh access token. Default semua endpoint butuh login. */
export const Public = () => SetMetadata(IS_PUBLIC, true)
