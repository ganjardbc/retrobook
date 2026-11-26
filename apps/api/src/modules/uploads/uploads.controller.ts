import { Controller, HttpCode, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { ImageFileInterceptor } from './image-upload.interceptor'
import { UploadsService } from './uploads.service'
import { RateLimit, UPLOAD_PER_USER } from '../../common/rate-limit'

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  /** POST-02: satu foto untuk post; hasilnya dipakai sebagai imageUrl di POST /posts. */
  @Post('post-image')
  @HttpCode(201)
  @RateLimit(UPLOAD_PER_USER)
  @UseInterceptors(ImageFileInterceptor())
  async postImage(@UploadedFile() file?: Express.Multer.File) {
    return { url: await this.uploads.saveImage(file) }
  }
}
