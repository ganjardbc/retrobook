import { Module } from '@nestjs/common'
import { BlockedWordsModule } from '../blocked-words/blocked-words.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { UploadsModule } from '../uploads/uploads.module'
import { FeedController, HashtagsController, PostsController } from './posts.controller'
import { PostsService } from './posts.service'

@Module({
  imports: [UploadsModule, NotificationsModule, BlockedWordsModule],
  controllers: [PostsController, FeedController, HashtagsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
