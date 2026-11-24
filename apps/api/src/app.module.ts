import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { validateEnv } from './config/env.validation'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { UploadsModule } from './modules/uploads/uploads.module'
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
    HealthModule,
  ],
})
export class AppModule {}
