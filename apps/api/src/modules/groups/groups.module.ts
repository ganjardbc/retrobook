import { Module } from '@nestjs/common'
import { PostsModule } from '../posts/posts.module'
import { UploadsModule } from '../uploads/uploads.module'
import { GroupsController } from './groups.controller'
import { GroupsService } from './groups.service'

@Module({
  imports: [PostsModule, UploadsModule],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}
