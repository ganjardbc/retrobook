import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { validateEnv } from './config/env.validation'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { PostsModule } from './modules/posts/posts.module'
import { UploadsModule } from './modules/uploads/uploads.module'
import { VisibilityModule } from './modules/visibility/visibility.module'
import { HealthModule } from './modules/health/health.module'

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
    HealthModule,
  ],
})
export class AppModule {}
