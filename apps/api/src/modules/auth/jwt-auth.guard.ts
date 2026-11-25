import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../prisma/prisma.service'
import { AppException } from '../../common/app-exception'
import { SettingsService } from '../settings/settings.service'
import { IS_PUBLIC } from './public.decorator'

/**
 * Guard global. Setiap request memeriksa status akun di database, sehingga suspend/ban
 * langsung berlaku pada request berikutnya (AUTH-04, E2E-10).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) {
      return true
    }
    const req = ctx.switchToHttp().getRequest()
    const [scheme, token] = String(req.headers.authorization ?? '').split(' ')
    if (scheme !== 'Bearer' || !token) {
      throw new AppException(401, 'UNAUTHORIZED', 'Silakan login terlebih dahulu')
    }

    let sub: string
    try {
      sub = (await this.jwt.verifyAsync<{ sub: string }>(token)).sub
    } catch (e) {
      const expired = e instanceof Error && e.name === 'TokenExpiredError'
      throw new AppException(
        401,
        expired ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED',
        expired ? 'Sesi kedaluwarsa' : 'Token tidak valid',
      )
    }

    const user = await this.prisma.user.findUnique({
      where: { id: sub },
      select: { id: true, role: true, status: true, deletedAt: true },
    })
    if (!user || user.deletedAt) throw new AppException(401, 'UNAUTHORIZED', 'Token tidak valid')
    if (user.status === 'SUSPENDED') {
      throw new AppException(403, 'ACCOUNT_SUSPENDED', 'Akun kamu ditangguhkan')
    }
    if (user.status === 'BANNED') {
      throw new AppException(403, 'ACCOUNT_BANNED', 'Akun kamu diblokir')
    }
    // BR-12: saat maintenance hanya admin yang lolos; status akun diperiksa lebih dulu.
    if (user.role !== 'ADMIN' && (await this.settings.get()).maintenanceMode) {
      throw new AppException(403, 'MAINTENANCE_MODE', 'Sedang dalam pemeliharaan')
    }
    req.user = { id: user.id, role: user.role }
    return true
  }
}
