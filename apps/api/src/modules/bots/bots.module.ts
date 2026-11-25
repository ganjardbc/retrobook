import { Module } from '@nestjs/common'
import { NotificationsModule } from '../notifications/notifications.module'
import { BotTextProvider, TemplateBotTextProvider } from './bot-text.provider'
import { BotsService } from './bots.service'

@Module({
  imports: [NotificationsModule],
  providers: [BotsService, { provide: BotTextProvider, useClass: TemplateBotTextProvider }],
  exports: [BotsService],
})
export class BotsModule {}
