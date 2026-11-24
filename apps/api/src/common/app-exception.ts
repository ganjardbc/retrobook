import { HttpException } from '@nestjs/common'

/** Error aplikasi dengan kode mesin yang stabil (docs/04-api-spec.md 1.1). */
export class AppException extends HttpException {
  constructor(
    status: number,
    public readonly code: string,
    message: string | string[],
    /** Detik sampai boleh mencoba lagi; dikirim sebagai header `Retry-After` (429). */
    public readonly retryAfter?: number,
  ) {
    super({ message }, status)
  }
}
