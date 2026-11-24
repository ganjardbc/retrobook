import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { validateEnv } from './config/env.validation'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { CommentsModule } from './modules/comments/comments.module'
import { FriendsModule } from './modules/friends/friends.module'
import { LikesModule } from './modules/likes/likes.module'
import { PostsModule } from './modules/posts/posts.module'
import { UploadsModule } from './modules/uploads/uploads.module'
import { UsersModule } from './modules/users/users.module'
import { VisibilityModule } from './modules/visibility/visibility.module'
import { HealthModule } from './modules/health/health.module'
import { BlocksModule } from './modules/blocks/blocks.module'
import { RealtimeModule } from './modules/realtime/realtime.module'

// Satu modul per domain di src/modules/*; tambahkan ke imports saat tugasnya dikerjakan.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    UploadsModule,
    VisibilityModule,
    PostsModule,
    LikesModule,
    CommentsModule,
    FriendsModule,
    BlocksModule,
    UsersModule,
    RealtimeModule,
    HealthModule,
  ],
})
export class AppModule {}
