import { Transform } from 'class-transformer'
import { IsEmail, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

export class RegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Email tidak valid' })
  @MaxLength(191)
  email!: string

  @Transform(trim)
  @Matches(/^[A-Za-z0-9._]{3,30}$/, {
    message: 'Username 3 sampai 30 karakter: huruf, angka, titik, atau garis bawah',
  })
  username!: string

  @Transform(trim)
  @IsString()
  @Length(1, 80, { message: 'Nama tampil 1 sampai 80 karakter' })
  displayName!: string

  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(128, { message: 'Password maksimal 128 karakter' })
  password!: string
}

export class LoginDto {
  @Transform(trim)
  @IsString()
  @Length(1, 191)
  identifier!: string

  @IsString()
  @Length(1, 128)
  password!: string
}

export class ForgotPasswordDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Email tidak valid' })
  @MaxLength(191)
  email!: string
}

export class ResetPasswordDto {
  @IsString()
  @Length(10, 200)
  token!: string

  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(128, { message: 'Password maksimal 128 karakter' })
  password!: string
}

export class RefreshDto {
  @IsString()
  @Length(1, 200)
  refreshToken!: string
}
