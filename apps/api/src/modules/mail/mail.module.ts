import { Global, Module } from '@nestjs/common'
import { Mailer, OutboxMailer } from './mailer'

@Global()
@Module({ providers: [{ provide: Mailer, useClass: OutboxMailer }], exports: [Mailer] })
export class MailModule {}
