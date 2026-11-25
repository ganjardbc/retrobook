import { Injectable, Logger } from '@nestjs/common'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'

export type Mail = { to: string; subject: string; text: string }

/**
 * Pengirim email (AUTH-05). Penyedia email belum dipilih (D-7): implementasi nyata cukup memperluas
 * kelas ini dan menggantinya di MailModule.
 */
export abstract class Mailer {
  abstract send(mail: Mail): Promise<void>
}

/**
 * Bawaan tanpa penyedia. Di dev, email ditulis ke folder `outbox/` (di .gitignore) supaya tautan reset bisa
 * dibuka tanpa menulis token ke log. Di production tidak ada yang dikirim dan hanya peringatan tanpa isi
 * yang dicatat.
 */
@Injectable()
export class OutboxMailer extends Mailer {
  private readonly log = new Logger('Mailer')

  async send(mail: Mail): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      this.log.warn('Penyedia email belum dikonfigurasi; email tidak terkirim')
      return
    }
    const dir = join(process.cwd(), 'outbox')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, `${Date.now()}-${randomBytes(3).toString('hex')}.txt`), `To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n`)
  }
}
