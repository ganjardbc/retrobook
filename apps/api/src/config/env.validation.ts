import { plainToInstance } from 'class-transformer'
import { IsInt, IsString, Matches, Max, Min, MinLength, validateSync } from 'class-validator'

export class Env {
  @IsString() @MinLength(1) DATABASE_URL!: string
  // Panjang minimal agar `change-me` dari .env.example ditolak di luar dev.
  @IsString() @MinLength(8) JWT_SECRET!: string
  @Matches(/^\d+[smhd]$/) JWT_ACCESS_TTL: string = '15m'
  @Matches(/^\d+[smhd]$/) JWT_REFRESH_TTL: string = '30d'
  @IsString() CORS_ORIGINS: string = 'http://localhost:5173,http://localhost:5174'
  @IsInt() @Min(1) @Max(65535) API_PORT: number = 3030
  // Folder unggahan, relatif terhadap direktori kerja API. Pindah ke S3-compatible saat deploy (D-3).
  @IsString() @MinLength(1) UPLOAD_DIR: string = 'uploads'
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, raw, { enableImplicitConversion: true })
  const errors = validateSync(env, { skipMissingProperties: false })
  if (errors.length > 0) {
    const detail = errors.flatMap((e) => Object.values(e.constraints ?? {})).join('; ')
    throw new Error(`Konfigurasi .env tidak valid: ${detail}`)
  }
  return env
}
