import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import type { Prisma, User } from '@prisma/client'
import type { FriendsPage, Paged, Post, Profile, ProfilePhoto } from '@retrobook/shared'
import { AppException } from '../../common/app-exception'
import { NEWEST_FIRST } from '../../common/keyset'
import { PrismaService } from '../../prisma/prisma.service'
import { FriendsService } from '../friends/friends.service'
import { PostsService } from '../posts/posts.service'
import { UploadsService } from '../uploads/uploads.service'
import { VisibilityService } from '../visibility/visibility.service'
import type { UpdateProfileDto } from './dto/profile.dto'
import type { UpdatePrivacyDto } from './dto/privacy.dto'
import * as argon2 from 'argon2'
import { randomBytes } from 'node:crypto'

/**
 * Profil (PRF-01). Semua info profil terlihat oleh member yang login (BR-02; pengaturan privasi
 * profil baru di PRF-06). Akun terhapus atau BANNED menghasilkan 404 yang sama dengan username
 * yang tidak ada (BR-05).
 *
 */
@Injectable()
export class UsersService implements OnModuleInit, OnModuleDestroy {
  private anonymizeTimer?: NodeJS.Timeout
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
    private readonly friends: FriendsService,
    private readonly posts: PostsService,
    private readonly uploads: UploadsService,
  ) {}

  onModuleInit() {
    this.anonymizeTimer = setInterval(
      () => void this.anonymizeExpiredAccounts().catch(() => undefined),
      60 * 60 * 1000,
    )
    this.anonymizeTimer.unref()
    void this.anonymizeExpiredAccounts().catch(() => undefined)
  }

  onModuleDestroy() {
    if (this.anonymizeTimer) clearInterval(this.anonymizeTimer)
  }

  async deleteAccount(userId: number, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { passwordHash: true },
    })
    if (!user) throw new AppException(404, 'NOT_FOUND', 'Akun tidak ditemukan')
    if (!(await argon2.verify(user.passwordHash, password))) {
      throw new AppException(403, 'INVALID_CREDENTIALS', 'Password tidak cocok')
    }
    const now = new Date()
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { deletedAt: now } }),
      this.prisma.post.updateMany({
        where: { authorId: userId, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.comment.updateMany({
        where: { authorId: userId, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.message.updateMany({
        where: { OR: [{ senderId: userId }, { receiverId: userId }], deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.note.updateMany({
        where: { authorId: userId, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.album.updateMany({
        where: { ownerId: userId, deletedAt: null },
        data: { deletedAt: now },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId } }),
    ])
  }

  async anonymizeExpiredAccounts() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const accounts = await this.prisma.user.findMany({
      where: { deletedAt: { lte: cutoff }, NOT: { username: { startsWith: 'deleted-' } } },
      select: { id: true },
      take: 100,
    })
    for (const account of accounts) {
      const id = account.id
      await this.prisma.user.updateMany({
        where: { id, deletedAt: { lte: cutoff }, NOT: { username: { startsWith: 'deleted-' } } },
        data: {
          email: `deleted-${id}@invalid.local`,
          username: `deleted-${id}`,
          displayName: 'Deleted account',
          passwordHash: await argon2.hash(randomBytes(32).toString('hex')),
          bio: null,
          birthday: null,
          hometown: null,
          currentCity: null,
          workplace: null,
          school: null,
          avatarUrl: null,
          coverUrl: null,
        },
      })
    }
    return accounts.length
  }

  async getProfile(viewerId: number, username: string): Promise<Profile> {
    return this.buildProfile(await this.findProfileUser(viewerId, username), viewerId)
  }

  /** PRF-02: ubah profil sendiri. Hanya kolom yang dikirim yang berubah. */
  async updateMe(viewerId: number, dto: UpdateProfileDto): Promise<Profile> {
    const data: Prisma.UserUpdateInput = {}
    if (dto.displayName !== undefined) {
      const name = dto.displayName.trim()
      if (!name) throw new AppException(400, 'VALIDATION_FAILED', 'Nama tidak boleh kosong')
      data.displayName = name
    }
    for (const key of ['bio', 'hometown', 'currentCity', 'workplace', 'school'] as const) {
      if (dto[key] !== undefined) data[key] = blankToNull(dto[key])
    }
    if (dto.birthday !== undefined) data.birthday = parseBirthday(dto.birthday)

    const user = await this.prisma.user.update({ where: { id: viewerId }, data })
    return this.buildProfile(user, viewerId)
  }

  async getPrivacy(userId: number) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { profileInfoPrivacy: true, friendsPrivacy: true, defaultPostPrivacy: true },
    })
  }

  async updatePrivacy(userId: number, dto: UpdatePrivacyDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: { profileInfoPrivacy: true, friendsPrivacy: true, defaultPostPrivacy: true },
    })
  }

  /** PRF-03: ganti foto profil atau cover. Berkas lama tetap tersimpan (hanya URL yang diganti). */
  async setPhoto(
    viewerId: number,
    kind: 'avatar' | 'cover',
    file: { buffer: Buffer } | undefined,
  ): Promise<Profile> {
    const url = await this.uploads.saveImage(file)
    const user = await this.prisma.user.update({
      where: { id: viewerId },
      data: kind === 'avatar' ? { avatarUrl: url } : { coverUrl: url },
    })
    return this.buildProfile(user, viewerId)
  }

  private async buildProfile(u: User, viewerId: number): Promise<Profile> {
    const [friendCount, relationship] = await Promise.all([
      this.friends.count(u.id),
      this.friends.relationshipOf(viewerId, u.id),
    ])
    const self = u.id === viewerId
    const profileInfoVisible = canViewPrivacy(u.profileInfoPrivacy, self, relationship)
    const friendsVisible = canViewPrivacy(u.friendsPrivacy, self, relationship)
    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      isBot: u.isBot,
      coverUrl: u.coverUrl,
      bio: profileInfoVisible ? u.bio : null,
      birthday: profileInfoVisible && u.birthday ? u.birthday.toISOString().slice(0, 10) : null,
      hometown: profileInfoVisible ? u.hometown : null,
      currentCity: profileInfoVisible ? u.currentCity : null,
      workplace: profileInfoVisible ? u.workplace : null,
      school: profileInfoVisible ? u.school : null,
      profileInfoVisible,
      friendsVisible,
      friendCount: friendsVisible ? friendCount : 0,
      relationship,
      createdAt: u.createdAt.toISOString(),
    }
  }

  async timeline(
    viewerId: number,
    username: string,
    limit: number,
    cursor?: number,
    year?: number,
  ): Promise<Paged<Post>> {
    const u = await this.findProfileUser(viewerId, username)
    return this.posts.timeline(viewerId, u.id, limit, cursor, year)
  }

  /** PRF-05: tahun yang punya post terlihat di timeline profil ini (untuk scroller tahun). */
  async years(viewerId: number, username: string): Promise<{ items: number[] }> {
    const u = await this.findProfileUser(viewerId, username)
    return { items: await this.posts.timelineYears(viewerId, u.id) }
  }

  /** Daftar teman pemilik profil (PRF-01 tab Friends). Terlihat oleh semua member sampai PRF-06 (Fase 3). */
  async friendsOf(
    viewerId: number,
    username: string,
    limit: number,
    cursor?: number,
    q?: string,
  ): Promise<FriendsPage> {
    const u = await this.findProfileUser(viewerId, username)
    const relationship = await this.friends.relationshipOf(viewerId, u.id)
    if (!canViewPrivacy(u.friendsPrivacy, viewerId === u.id, relationship)) {
      return { items: [], nextCursor: null, total: 0 }
    }
    return this.friends.list(u.id, limit, cursor, q, viewerId)
  }

  /**
   * Tab Photos: gambar dari post pemilik profil yang boleh dilihat pembaca (aturan yang sama dengan
   * timeline). Album dan foto profil menyusul bersama Fase 3.
   */
  async photos(
    viewerId: number,
    username: string,
    limit: number,
    cursor?: number,
  ): Promise<Paged<ProfilePhoto> & { total: number }> {
    const u = await this.findProfileUser(viewerId, username)
    const where = {
      AND: [
        this.visibility.postWhere(viewerId),
        { OR: [{ authorId: u.id }, { wallOwnerId: u.id }] },
        { imageUrl: { not: null } },
      ],
    }
    const [rows, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy: NEWEST_FIRST,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: { id: true, imageUrl: true, createdAt: true },
      }),
      this.prisma.post.count({ where }),
    ])
    const page = rows.slice(0, limit)
    return {
      items: page.map((r) => ({
        postId: r.id,
        url: r.imageUrl!,
        createdAt: r.createdAt.toISOString(),
      })),
      nextCursor: rows.length > limit ? page[page.length - 1]!.id : null,
      total,
    }
  }

  /** Username dicocokkan tanpa memperhatikan huruf besar (collation database). */
  private async findProfileUser(viewerId: number, username: string) {
    const user = await this.prisma.user.findFirst({
      where: { username, ...this.visibility.userWhere(viewerId) },
    })
    if (!user) throw new AppException(404, 'NOT_FOUND', 'Pengguna tidak ditemukan')
    return user
  }
}

/** Teks kosong atau spasi saja berarti "kosongkan kolom". */
const blankToNull = (v: string | null | undefined): string | null => {
  const t = v?.trim()
  return t ? t : null
}

function canViewPrivacy(
  privacy: 'PUBLIC' | 'FRIENDS' | 'ONLY_ME',
  self: boolean,
  relationship: string,
) {
  return self || privacy === 'PUBLIC' || (privacy === 'FRIENDS' && relationship === 'FRIENDS')
}

/** YYYY-MM-DD yang sungguh ada di kalender, antara 1900-01-01 dan hari ini (UTC); null/kosong menghapus. */
function parseBirthday(v: string | null | undefined): Date | null {
  if (v === null || v === undefined) return null
  const date = new Date(`${v}T00:00:00.000Z`)
  const valid = !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === v
  if (!valid || v < '1900-01-01' || date.getTime() > Date.now()) {
    throw new AppException(400, 'VALIDATION_FAILED', 'Tanggal lahir tidak valid')
  }
  return date
}
