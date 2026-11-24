import { Injectable } from '@nestjs/common'
import type { Paged, Post, Profile } from '@retrobook/shared'
import { AppException } from '../../common/app-exception'
import { PrismaService } from '../../prisma/prisma.service'
import { FriendsService } from '../friends/friends.service'
import { PostsService } from '../posts/posts.service'
import { VisibilityService } from '../visibility/visibility.service'

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
  ) {}

  async getProfile(viewerId: number, username: string): Promise<Profile> {
    const u = await this.findProfileUser(username)
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
