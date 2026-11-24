import { Module } from '@nestjs/common'
import { RealtimeModule } from '../realtime/realtime.module'
import { ChatController, MessagesController } from './messages.controller'
import { MessagesGateway } from './messages.gateway'
import { MessagesService } from './messages.service'

@Module({
  imports: [RealtimeModule],
  controllers: [MessagesController, ChatController],
  providers: [MessagesService, MessagesGateway],
})
export class MessagesModule {}
