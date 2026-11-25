import { Module } from '@nestjs/common'
import { FriendsModule } from '../friends/friends.module'
import { UploadsModule } from '../uploads/uploads.module'
import { AlbumsController, ProfileAlbumsController } from './albums.controller'
import { AlbumsService } from './albums.service'

@Module({
  imports: [FriendsModule, UploadsModule],
  controllers: [AlbumsController, ProfileAlbumsController],
  providers: [AlbumsService],
})
export class AlbumsModule {}
