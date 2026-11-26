import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomBytes } from 'node:crypto'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { AppException } from '../../common/app-exception'
import type { Env } from '../../config/env.validation'
import { detectImageExt } from './image-type'

@Injectable()
export class UploadsService implements OnModuleInit {
  readonly dir: string

  constructor(config: ConfigService<Env, true>) {
    this.dir = resolve(config.get('UPLOAD_DIR'))
  }

  onModuleInit() {
    return mkdir(this.dir, { recursive: true })
  }

  /** Apakah URL `/uploads/<nama>` menunjuk berkas yang ada (nama sudah divalidasi pemanggil). */
  async exists(url: string): Promise<boolean> {
    const name = url.replace(/^\/uploads\//, '')
    if (name === url || name.includes('/') || name.includes('..')) return false
    return access(join(this.dir, name)).then(
      () => true,
      () => false,
    )
  }

  /**
   * Simpan gambar dan kembalikan URL publik. Tipe ditentukan dari isi berkas dan nama
   * ditentukan server (acak), sehingga nama dari klien tidak pernah menyentuh disk.
   */
  async saveImage(file: { buffer: Buffer } | undefined): Promise<string> {
    if (!file || file.buffer.length === 0) {
      throw new AppException(400, 'VALIDATION_FAILED', 'An image file is required')
    }
    const ext = detectImageExt(file.buffer)
    if (!ext) {
      throw new AppException(415, 'UNSUPPORTED_MEDIA_TYPE', 'Only JPG, PNG, or WebP are allowed')
    }
    const name = `${randomBytes(16).toString('hex')}.${ext}`
    await writeFile(join(this.dir, name), file.buffer, { flag: 'wx' })
    return `/uploads/${name}`
  }
}
