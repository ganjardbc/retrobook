import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import { configureApp } from './common/configure-app'
import { serveUploads } from './modules/uploads/serve-uploads'
import type { Env } from './config/env.validation'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const config = app.get<ConfigService<Env, true>>(ConfigService)
  configureApp(app)
  serveUploads(app)
  app.enableCors({
    origin: config
      .get('CORS_ORIGINS')
      .split(',')
      .map((s: string) => s.trim()),
  })
  await app.listen(config.get('API_PORT'))
}

void bootstrap()
