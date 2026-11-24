import type { NestExpressApplication } from '@nestjs/platform-express'
import { UploadsService } from './uploads.service'

/** Sajikan /uploads sebagai berkas statis (tanpa listing direktori, tanpa sniffing tipe). */
export function serveUploads(app: NestExpressApplication): void {
  app.useStaticAssets(app.get(UploadsService).dir, {
    prefix: '/uploads',
    index: false,
    dotfiles: 'deny',
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  })
}
