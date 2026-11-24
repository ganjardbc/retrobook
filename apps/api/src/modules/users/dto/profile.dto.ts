import { IsOptional, IsString, Matches, MaxLength } from 'class-validator'

/**
 * PATCH /me (PRF-02). Semua opsional: field yang tidak dikirim tidak berubah; `null` atau teks kosong
 * mengosongkan kolom opsional. Field lain (role, status, avatar, email, ...) ditolak oleh whitelist.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80, { message: 'Nama maksimal 80 karakter' })
  displayName?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Bio maksimal 2.000 karakter' })
  bio?: string | null

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Tanggal lahir harus berformat YYYY-MM-DD' })
  birthday?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(80, { message: 'Kota asal maksimal 80 karakter' })
  hometown?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(80, { message: 'Kota tinggal maksimal 80 karakter' })
  currentCity?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Tempat kerja maksimal 120 karakter' })
  workplace?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Sekolah maksimal 120 karakter' })
  school?: string | null
}
