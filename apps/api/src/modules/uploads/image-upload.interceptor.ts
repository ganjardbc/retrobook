import { FileInterceptor } from '@nestjs/platform-express'
import { MAX_IMAGE_BYTES } from './image-type'

/**
 * Menerima satu berkas pada field `file`, maksimum 5 MB. Tanpa `dest`/`storage`, multer menyimpan
 * di memori: isi diperiksa dulu (UploadsService.saveImage) sebelum menyentuh disk.
 */
export const ImageFileInterceptor = () =>
  FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } })
