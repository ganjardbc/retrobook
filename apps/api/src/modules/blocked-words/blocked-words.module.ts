import { Module } from '@nestjs/common'
import { BlockedWordsService } from './blocked-words.service'

@Module({ providers: [BlockedWordsService], exports: [BlockedWordsService] })
export class BlockedWordsModule {}
