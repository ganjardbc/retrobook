import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common'
import type { Response } from 'express'
import { AppException } from './app-exception'

// Kode bawaan per status bila exception tidak membawa kode sendiri.
const DEFAULT_CODES: Record<number, string> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'FILE_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'UNPROCESSABLE',
  429: 'RATE_LIMITED',
}

/** Semua error keluar sebagai { statusCode, message, code }; error tak terduga tidak membocorkan detail. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions')

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>()

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus()
      const code =
        exception instanceof AppException ? exception.code : (DEFAULT_CODES[statusCode] ?? 'ERROR')
      if (exception instanceof AppException && exception.retryAfter !== undefined) {
        res.setHeader('Retry-After', String(exception.retryAfter))
      }
      res.status(statusCode).json({ statusCode, message: this.messageOf(exception), code })
      return
    }

    this.logger.error(
      exception instanceof Error ? (exception.stack ?? exception.message) : exception,
    )
    res.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  }

  private messageOf(e: HttpException): string | string[] {
    const body = e.getResponse()
    if (typeof body === 'string') return body
    const message = (body as { message?: string | string[] }).message
    return message ?? e.message
  }
}
