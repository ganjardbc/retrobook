import {
  Body,
  Controller,
  HttpCode,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import { ImageFileInterceptor } from '../uploads/image-upload.interceptor'
import { UpdateProfileDto } from './dto/profile.dto'
import { UsersService } from './users.service'

@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateMe(user.id, dto)
  }

  @Post('avatar')
  @HttpCode(200)
  @UseInterceptors(ImageFileInterceptor())
  avatar(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    return this.users.setPhoto(user.id, 'avatar', file)
  }

  @Post('cover')
  @HttpCode(200)
  @UseInterceptors(ImageFileInterceptor())
  cover(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    return this.users.setPhoto(user.id, 'cover', file)
  }
}
