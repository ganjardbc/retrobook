import { isUUID } from 'class-validator'

/** Id (UUID v4) dari payload yang tidak tepercaya, mis. event socket. */
export const isId = (v: unknown): v is string => typeof v === 'string' && isUUID(v, '4')
