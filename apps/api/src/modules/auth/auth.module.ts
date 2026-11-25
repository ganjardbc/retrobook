import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { SettingsModule } from '../settings/settings.module'
import type { Env } from '../../config/env.validation'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { LoginLockout } from './login-lockout'
import { JwtAuthGuard } from './jwt-auth.guard'

@Module({
  imports: [
    SettingsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET'),
        // ms-format string ('15m'); tipe jsonwebtoken terlalu sempit untuk string biasa.
        signOptions: { expiresIn: config.get('JWT_ACCESS_TTL') as never },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LoginLockout, { provide: APP_GUARD, useClass: JwtAuthGuard }],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
