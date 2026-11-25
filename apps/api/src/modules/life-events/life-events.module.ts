import { Module } from '@nestjs/common'
import { LifeEventsController, ProfileLifeEventsController } from './life-events.controller'
import { LifeEventsService } from './life-events.service'

@Module({
  controllers: [LifeEventsController, ProfileLifeEventsController],
  providers: [LifeEventsService],
})
export class LifeEventsModule {}
