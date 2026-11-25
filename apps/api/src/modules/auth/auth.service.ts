import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Prisma, Role, User } from '@prisma/client'
import * as argon2 from 'argon2'
import { AppException } from '../../common/app-exception'
import type { Env } from '../../config/env.validation'
import { PrismaService } from '../../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'
import { LoginDto, RegisterDto } from './dto/auth.dto'
import { hashToken, newRefreshToken, ttlToMs } from './token.util'

// Segmen rute di user app yang tidak boleh jadi username (docs/07-test-plan.md AUTH-01).
const RESERVED_USERNAMES = new Set([
  'admin',
  'settings',
  'friends',
  'messages',
  'notifications',
  'search',
  'login',
  'register',
  'logout',
  'privacy',
  'maintenance',
  'hashtag',
  'poke',
  'pokes',
  'me',
  'api',
  'static',
  'uploads',
])

const INVALID_CREDENTIALS = () =>
  new AppException(401, 'INVALID_CREDENTIALS', 'Email/username atau password salah')

type TokenUser = Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'role'>

const maintenance = () => new AppException(403, 'MAINTENANCE_MODE', 'Sedang dalam pemeliharaan')

@Injectable()
export class AuthService {
  // Hash palsu agar waktu respons login tidak membedakan akun yang ada dan tidak ada.
  private dummyHash?: Promise<string>

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly settings: SettingsService,
  ) {}

  async register(dto: RegisterDto) {
    const { maintenanceMode, registrationOpen } = await this.settings.get()
    if (maintenanceMode) throw maintenance()
    if (!registrationOpen) {
      throw new AppException(403, 'REGISTRATION_CLOSED', 'Pendaftaran sedang ditutup')
    }
    if (RESERVED_USERNAMES.has(dto.username.toLowerCase())) {
      throw new AppException(409, 'USERNAME_TAKEN', 'Username sudah dipakai')
    }
    const passwordHash = await argon2.hash(dto.password)
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          displayName: dto.displayName,
          passwordHash,
        },
      })
      return this.issue(user)
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const target = String(e.meta?.target ?? '')
        if (target.includes('email'))
          throw new AppException(409, 'EMAIL_TAKEN', 'Email sudah dipakai')
        throw new AppException(409, 'USERNAME_TAKEN', 'Username sudah dipakai')
      }
      throw e
    }
  }

  async login(dto: LoginDto, requiredRole?: Role) {
    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ email: dto.identifier.toLowerCase() }, { username: dto.identifier }],
      },
    })
    // Bot tidak punya login (BR-09); diperlakukan seperti akun yang tidak ada.
    if (!user || user.isBot) {
      this.dummyHash ??= argon2.hash('dummy-password')
      await argon2.verify(await this.dummyHash, dto.password)
      throw INVALID_CREDENTIALS()
    }
    if (!(await argon2.verify(user.passwordHash, dto.password))) throw INVALID_CREDENTIALS()
    this.assertCanSignIn(user)
    if (requiredRole && user.role !== requiredRole) {
      throw new AppException(403, 'FORBIDDEN', 'Akses hanya untuk administrator')
    }
    await this.assertNotInMaintenance(user)
    return this.issue(user)
  }

  async refresh(refreshToken: string, requiredRole?: Role) {
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    })
    if (!row) throw new AppException(401, 'UNAUTHORIZED', 'Token tidak valid')

    if (row.revokedAt) {
      // Token yang sudah dirotasi dipakai lagi: anggap dicuri, cabut semua sesi user ini.
      await this.revokeAll(row.userId)
      throw new AppException(401, 'UNAUTHORIZED', 'Token tidak valid')
    }
    if (row.expiresAt < new Date()) {
      throw new AppException(401, 'TOKEN_EXPIRED', 'Sesi kedaluwarsa')
    }
    if (row.user.deletedAt || row.user.isBot) {
      throw new AppException(401, 'UNAUTHORIZED', 'Token tidak valid')
    }
    this.assertCanSignIn(row.user)
    if (requiredRole && row.user.role !== requiredRole) {
      throw new AppException(403, 'FORBIDDEN', 'Akses hanya untuk administrator')
    }
    await this.assertNotInMaintenance(row.user)

    // Pencabutan bersyarat membuat dua refresh bersamaan tidak bisa sama-sama berhasil.
    const revoked = await this.prisma.refreshToken.updateMany({
      where: { id: row.id, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    if (revoked.count !== 1) throw new AppException(401, 'UNAUTHORIZED', 'Token tidak valid')
    return this.issue(row.user)
  }

  async logout(userId: number, refreshToken: string, tx?: Prisma.TransactionClient): Promise<void> {
    const database = tx ?? this.prisma
    await database.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  revokeAll(userId: number) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  /** BR-12: maintenance mode hanya meloloskan admin. */
  private async assertNotInMaintenance(user: Pick<User, 'role'>) {
    if (user.role !== 'ADMIN' && (await this.settings.get()).maintenanceMode) throw maintenance()
  }

  private assertCanSignIn(user: Pick<User, 'status'>) {
    if (user.status === 'SUSPENDED') {
      throw new AppException(403, 'ACCOUNT_SUSPENDED', 'Akun kamu ditangguhkan')
    }
    if (user.status === 'BANNED') {
      throw new AppException(403, 'ACCOUNT_BANNED', 'Akun kamu diblokir')
    }
  }

  private async issue(user: TokenUser) {
    const refreshToken = newRefreshToken()
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + ttlToMs(this.config.get('JWT_REFRESH_TTL'))),
      },
    })
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role })
    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      accessToken,
      refreshToken,
    }
  }
}
