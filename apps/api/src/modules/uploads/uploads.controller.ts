import { Controller, HttpCode, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { ImageFileInterceptor } from './image-upload.interceptor'
import { UploadsService } from './uploads.service'

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  /** POST-02: satu foto untuk post; hasilnya dipakai sebagai imageUrl di POST /posts. */
  @Post('post-image')
  @HttpCode(201)
  @UseInterceptors(ImageFileInterceptor())
  async postImage(@UploadedFile() file?: Express.Multer.File) {
    return { url: await this.uploads.saveImage(file) }
  }
}
