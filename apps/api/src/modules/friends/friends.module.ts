import { Module } from '@nestjs/common'
import { NotificationsModule } from '../notifications/notifications.module'
import { FriendDiscoveryService } from './discovery.service'
import { FriendsController } from './friends.controller'
import { FriendsService } from './friends.service'

@Module({
  imports: [NotificationsModule],
  controllers: [FriendsController],
  providers: [FriendsService, FriendDiscoveryService],
  exports: [FriendsService],
})
export class FriendsModule {}
