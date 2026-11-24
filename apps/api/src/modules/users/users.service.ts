import { Injectable } from '@nestjs/common'
import type { Prisma, User } from '@prisma/client'
import type { Paged, Post, Profile } from '@retrobook/shared'
import { AppException } from '../../common/app-exception'
import { PrismaService } from '../../prisma/prisma.service'
import { FriendsService } from '../friends/friends.service'
import { PostsService } from '../posts/posts.service'
import { UploadsService } from '../uploads/uploads.service'
import { VisibilityService } from '../visibility/visibility.service'
import type { UpdateProfileDto } from './dto/profile.dto'

/**
 * Profil (PRF-01). Semua info profil terlihat oleh member yang login (BR-02; pengaturan privasi
 * profil baru di PRF-06). Akun terhapus atau BANNED menghasilkan 404 yang sama dengan username
 * yang tidak ada (BR-05).
 *
 * TODO(BR-11, T-13): 404 bila pemanggil dan pemilik profil saling memblokir; tabel `blocks` belum ada.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
    private readonly friends: FriendsService,
    private readonly posts: PostsService,
    private readonly uploads: UploadsService,
  ) {}

  async getProfile(viewerId: number, username: string): Promise<Profile> {
    return this.buildProfile(await this.findProfileUser(username), viewerId)
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
    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      isBot: u.isBot,
      coverUrl: u.coverUrl,
      bio: u.bio,
      birthday: u.birthday ? u.birthday.toISOString().slice(0, 10) : null,
      hometown: u.hometown,
      currentCity: u.currentCity,
      workplace: u.workplace,
      school: u.school,
      friendCount,
      relationship,
      createdAt: u.createdAt.toISOString(),
    }
  }

  async timeline(
    viewerId: number,
    username: string,
    limit: number,
    cursor?: number,
  ): Promise<Paged<Post>> {
    const u = await this.findProfileUser(username)
    return this.posts.timeline(viewerId, u.id, limit, cursor)
  }

  /** Username dicocokkan tanpa memperhatikan huruf besar (collation database). */
  private async findProfileUser(username: string) {
    const user = await this.prisma.user.findFirst({
      where: { username, ...this.visibility.userWhere() },
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
