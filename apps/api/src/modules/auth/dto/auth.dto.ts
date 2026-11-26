import { Transform } from 'class-transformer'
import { IsEmail, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

export class RegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Invalid email' })
  @MaxLength(191)
  email!: string

  @Transform(trim)
  @Matches(/^[A-Za-z0-9._]{3,30}$/, {
    message: 'Username must be 3 to 30 characters: letters, numbers, dots, or underscores',
  })
  username!: string

  @Transform(trim)
  @IsString()
  @Length(1, 80, { message: 'Display name must be 1 to 80 characters' })
  displayName!: string

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
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
  @IsEmail({}, { message: 'Invalid email' })
  @MaxLength(191)
  email!: string
}

export class ResetPasswordDto {
  @IsString()
  @Length(10, 200)
  token!: string

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
  password!: string
}

export class RefreshDto {
  @IsString()
  @Length(1, 200)
  refreshToken!: string
}
