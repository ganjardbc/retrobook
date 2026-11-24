import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { validateEnv } from './config/env.validation'
import { HealthModule } from './modules/health/health.module'

// Satu modul per domain di src/modules/*; tambahkan ke imports saat tugasnya dikerjakan.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    HealthModule,
  ],
})
export class AppModule {}
