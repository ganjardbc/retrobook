import { Module } from '@nestjs/common'
import { FriendsModule } from '../friends/friends.module'
import { PostsModule } from '../posts/posts.module'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
  imports: [FriendsModule, PostsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
