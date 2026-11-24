import { plainToInstance } from 'class-transformer'
import { IsInt, IsString, Max, Min, MinLength, validateSync } from 'class-validator'

export class Env {
  @IsString() @MinLength(1) DATABASE_URL!: string
  // Panjang minimal agar `change-me` dari .env.example ditolak di luar dev.
  @IsString() @MinLength(8) JWT_SECRET!: string
  @IsString() JWT_ACCESS_TTL: string = '15m'
  @IsString() JWT_REFRESH_TTL: string = '30d'
  @IsString() CORS_ORIGINS: string = 'http://localhost:5173,http://localhost:5174'
  @IsInt() @Min(1) @Max(65535) API_PORT: number = 3000
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
