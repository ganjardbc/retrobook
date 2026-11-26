import { IsOptional, IsString, Matches, MaxLength } from 'class-validator'

/**
 * PATCH /me (PRF-02). Semua opsional: field yang tidak dikirim tidak berubah; `null` atau teks kosong
 * mengosongkan kolom opsional. Field lain (role, status, avatar, email, ...) ditolak oleh whitelist.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80, { message: 'Name must be at most 80 characters' })
  displayName?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Bio must be at most 2,000 characters' })
  bio?: string | null

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Birthday must be in YYYY-MM-DD format' })
  birthday?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(80, { message: 'Hometown must be at most 80 characters' })
  hometown?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(80, { message: 'Current city must be at most 80 characters' })
  currentCity?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Workplace must be at most 120 characters' })
  workplace?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'School must be at most 120 characters' })
  school?: string | null
}
