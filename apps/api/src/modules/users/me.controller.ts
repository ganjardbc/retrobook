import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import { ImageFileInterceptor } from '../uploads/image-upload.interceptor'
import { UpdateProfileDto } from './dto/profile.dto'
import { UpdatePrivacyDto } from './dto/privacy.dto'
import { DeleteAccountDto } from './dto/delete-account.dto'
import { UsersService } from './users.service'

@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get('privacy')
  privacy(@CurrentUser() user: AuthUser) {
    return this.users.getPrivacy(user.id)
  }

  @Patch('privacy')
  updatePrivacy(@CurrentUser() user: AuthUser, @Body() dto: UpdatePrivacyDto) {
    return this.users.updatePrivacy(user.id, dto)
  }

  @Delete()
  @HttpCode(204)
  async deleteAccount(@CurrentUser() user: AuthUser, @Body() dto: DeleteAccountDto) {
    await this.users.deleteAccount(user.id, dto.password)
  }

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
