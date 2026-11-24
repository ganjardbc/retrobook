import { Module } from '@nestjs/common'
import { NotificationsModule } from '../notifications/notifications.module'
import { UploadsModule } from '../uploads/uploads.module'
import { FeedController, PostsController } from './posts.controller'
import { PostsService } from './posts.service'

@Module({
  imports: [UploadsModule, NotificationsModule],
  controllers: [PostsController, FeedController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
