import { INestApplication, ValidationError, ValidationPipe } from '@nestjs/common'
import { AllExceptionsFilter } from './all-exceptions.filter'
import { AppException } from './app-exception'

const flatten = (errors: ValidationError[]): string[] =>
  errors.flatMap((e) => [...Object.values(e.constraints ?? {}), ...flatten(e.children ?? [])])

/** Pengaturan global yang dipakai main.ts dan tes, supaya perilaku sama. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api')
  app.useGlobalFilters(new AllExceptionsFilter())
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => new AppException(400, 'VALIDATION_FAILED', flatten(errors)),
    }),
  )
}
