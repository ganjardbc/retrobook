import { Module } from '@nestjs/common'
import { NotificationsModule } from '../notifications/notifications.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { PokesController } from './pokes.controller'
import { PokesService } from './pokes.service'

@Module({
  imports: [NotificationsModule, RealtimeModule],
  controllers: [PokesController],
  providers: [PokesService],
})
export class PokesModule {}
