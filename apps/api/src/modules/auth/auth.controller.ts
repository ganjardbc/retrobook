import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { AppException } from '../../common/app-exception'
import {
  FORGOT_PASSWORD_PER_IP,
  LOGIN_PER_IP,
  REGISTER_PER_IP,
  RateLimit,
} from '../../common/rate-limit'
import { AuthService } from './auth.service'
import { AuthUser, CurrentUser } from './current-user.decorator'
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto'
import { LoginLockout } from './login-lockout'
import { Public } from './public.decorator'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly lockout: LoginLockout,
  ) {}

  @Public()
  @RateLimit(REGISTER_PER_IP)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto)
  }

  @Public()
  @RateLimit(FORGOT_PASSWORD_PER_IP)
  @Post('forgot-password')
  @HttpCode(202)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto.email)
  }

  @Public()
  @RateLimit(FORGOT_PASSWORD_PER_IP)
  @Post('reset-password')
  @HttpCode(204)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto.token, dto.password)
  }

  @Public()
  @RateLimit(LOGIN_PER_IP)
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    this.lockout.assertOpen(dto.identifier)
    try {
      const session = await this.auth.login(dto)
      this.lockout.recordSuccess(dto.identifier)
      return session
    } catch (e) {
      // Hanya kredensial salah yang dihitung; akun ditangguhkan dan sejenisnya bukan percobaan menebak.
      if (e instanceof AppException && e.code === 'INVALID_CREDENTIALS') {
        this.lockout.recordFailure(dto.identifier)
      }
      throw e
    }
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken)
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@CurrentUser() user: AuthUser, @Body() dto: RefreshDto) {
    await this.auth.logout(user.id, dto.refreshToken)
  }
}
