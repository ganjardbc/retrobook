import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import { configureApp } from './common/configure-app'
import type { Env } from './config/env.validation'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get<ConfigService<Env, true>>(ConfigService)
  configureApp(app)
  app.enableCors({
    origin: config
      .get('CORS_ORIGINS')
      .split(',')
      .map((s: string) => s.trim()),
  })
  await app.listen(config.get('API_PORT'))
}

void bootstrap()
