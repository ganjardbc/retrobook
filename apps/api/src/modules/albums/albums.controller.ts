import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common'
import { FilesInterceptor } from '@nestjs/platform-express'
import { AuthUser, CurrentUser } from '../auth/current-user.decorator'
import { MAX_IMAGE_BYTES } from '../uploads/image-type'
import { AlbumsService } from './albums.service'
import { CreateAlbumDto } from './dto/album.dto'

@Controller('albums')
export class AlbumsController {
  constructor(private readonly albums: AlbumsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.albums.list(user.id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAlbumDto) {
    return this.albums.create(user.id, dto)
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.albums.get(user.id, id)
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    await this.albums.remove(user.id, id)
  }

  @Delete(':id/photos/:photoId')
  @HttpCode(204)
  async removePhoto(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('photoId', ParseIntPipe) photoId: number,
  ) {
    await this.albums.removePhoto(user.id, id, photoId)
  }

  @Post(':id/photos')
  @UseInterceptors(
    FilesInterceptor('files', 10, { limits: { fileSize: MAX_IMAGE_BYTES, files: 10 } }),
  )
  addPhotos(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.albums.addPhotos(user.id, id, files)
  }
}

@Controller('users')
export class ProfileAlbumsController {
  constructor(private readonly albums: AlbumsService) {}

  @Get(':username/albums')
  listForProfile(@CurrentUser() user: AuthUser, @Param('username') username: string) {
    return this.albums.listForProfile(user.id, username)
  }
}
