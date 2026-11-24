import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthUser, CurrentUser } from './current-user.decorator'
import { LoginDto, RefreshDto, RegisterDto } from './dto/auth.dto'
import { Public } from './public.decorator'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto)
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto)
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
