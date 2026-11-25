import { Module } from '@nestjs/common'
import { RealtimeModule } from '../realtime/realtime.module'
import { ActivityController } from './activity.controller'
import { ActivityService } from './activity.service'

@Module({
  imports: [RealtimeModule],
  controllers: [ActivityController],
  providers: [ActivityService],
})
export class ActivityModule {}
