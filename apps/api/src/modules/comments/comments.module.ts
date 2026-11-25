import { Module } from '@nestjs/common'
import { BlockedWordsModule } from '../blocked-words/blocked-words.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { UploadsModule } from '../uploads/uploads.module'
import { CommentsController } from './comments.controller'
import { CommentsService } from './comments.service'

@Module({
  imports: [NotificationsModule, BlockedWordsModule, UploadsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
