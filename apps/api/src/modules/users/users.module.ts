import { Module } from '@nestjs/common'
import { FriendsModule } from '../friends/friends.module'
import { PostsModule } from '../posts/posts.module'
import { UploadsModule } from '../uploads/uploads.module'
import { MeController } from './me.controller'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
  imports: [FriendsModule, PostsModule, UploadsModule],
  controllers: [UsersController, MeController],
  providers: [UsersService],
})
export class UsersModule {}
