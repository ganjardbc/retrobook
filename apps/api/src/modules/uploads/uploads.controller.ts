import { Controller, HttpCode, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { MAX_IMAGE_BYTES } from './image-type'
import { UploadsService } from './uploads.service'

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  /** POST-02: satu foto untuk post; hasilnya dipakai sebagai imageUrl di POST /posts. */
  @Post('post-image')
  @HttpCode(201)
  @UseInterceptors(
    FileInterceptor('file', {
      // Tanpa `dest`/`storage`, multer menyimpan di memori: isi diperiksa dulu sebelum menyentuh disk.
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  async postImage(@UploadedFile() file?: Express.Multer.File) {
    return { url: await this.uploads.saveImage(file) }
  }
}
