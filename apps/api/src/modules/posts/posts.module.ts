import { Module } from '@nestjs/common'
import { UploadsModule } from '../uploads/uploads.module'
import { FeedController, PostsController } from './posts.controller'
import { PostsService } from './posts.service'

@Module({
  imports: [UploadsModule],
  controllers: [PostsController, FeedController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
