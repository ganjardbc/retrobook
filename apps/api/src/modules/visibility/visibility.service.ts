import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'

/**
 * SATU-SATUNYA tempat aturan visibilitas konten ditulis (CLAUDE.md, risiko R-03).
 * Semua query baca post HARUS memakai postWhere/feedWhere; jangan menulis filter privasi
 * ad hoc di controller, service lain, atau frontend.
 *
 * Aturan (BR-02, 03, 04, 05, 07, 11): blokir berlaku dua arah; wall post harus memenuhi
 * pertemanan dengan penulis dan pemilik dinding.
 */
@Injectable()
export class VisibilityService {
  /** Akun yang boleh muncul bagi orang lain: tidak terhapus dan tidak BANNED (BR-05). */
  userWhere(viewerId?: string): Prisma.UserWhereInput {
    return {
      deletedAt: null,
      status: { not: 'BANNED' },
      ...(viewerId === undefined ? {} : { NOT: this.blockedPair(viewerId) }),
    }
  }

  /** Pengguna dalam pasangan blokir tidak saling menemukan satu sama lain (BR-11). */
  private blockedPair(viewerId: string): Prisma.UserWhereInput {
    return {
      OR: [
        { blocksMade: { some: { blockedId: viewerId } } },
        { blocksReceived: { some: { blockerId: viewerId } } },
      ],
    }
  }

  private noBlock(viewerId: string): Prisma.PostWhereInput {
    return { NOT: { author: this.blockedPair(viewerId) } }
  }

  /** Filter User: berteman (ACCEPTED, arah mana pun) dengan `viewerId`. */
  friendOf(viewerId: string): Prisma.UserWhereInput {
    return {
      OR: [
        { friendshipsSent: { some: { addresseeId: viewerId, status: 'ACCEPTED' } } },
        { friendshipsReceived: { some: { requesterId: viewerId, status: 'ACCEPTED' } } },
      ],
    }
  }

  postWhere(viewerId: string, includeGroupPosts = false): Prisma.PostWhereInput {
    return {
      deletedAt: null,
      author: this.userWhere(),
      AND: [
        this.noBlock(viewerId),
        { NOT: { wallOwner: this.blockedPair(viewerId) } },
        includeGroupPosts
          ? { OR: [{ groupId: null }, { group: { members: { some: { userId: viewerId } } } }] }
          : { groupId: null },
      ],
      OR: [
        // Penulis tetap bisa membaca post miliknya sendiri, termasuk yang dipasang di dinding.
        { authorId: viewerId },
        // Post biasa mengikuti privasi penulis.
        {
          wallOwnerId: null,
          hidden: false,
          OR: [{ privacy: 'PUBLIC' }, { privacy: 'FRIENDS', author: this.friendOf(viewerId) }],
        },
        // Post grup: semua anggota grup membaca, tanpa syarat berteman dengan penulis.
        {
          groupId: { not: null },
          hidden: false,
          group: { members: { some: { userId: viewerId } } },
        },
        // BR-04: pemilik dinding dan teman dari kedua pihak dapat membaca; pemilik dinding
        // juga dapat membaca post pada dindingnya sendiri.
        {
          wallOwnerId: { not: null },
          hidden: false,
          AND: [
            { privacy: { not: 'ONLY_ME' } },
            {
              OR: [
                { wallOwnerId: viewerId },
                {
                  AND: [
                    { author: this.friendOf(viewerId) },
                    { wallOwner: this.friendOf(viewerId) },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
  }

  /** Album yang boleh dilihat: milik sendiri, PUBLIC, atau FRIENDS dari teman; pemilik tidak diblokir (ALB-01). */
  albumWhere(viewerId: string): Prisma.AlbumWhereInput {
    return {
      deletedAt: null,
      owner: this.userWhere(viewerId),
      OR: [
        { ownerId: viewerId },
        { privacy: 'PUBLIC' },
        { privacy: 'FRIENDS', owner: this.friendOf(viewerId) },
      ],
    }
  }

  /**
   * Komentar yang boleh dibaca (di atas syarat bahwa post induknya terlihat, lihat postWhere):
   * belum dihapus, penulisnya tidak BANNED/terhapus, dan tidak hidden kecuali milik viewer (BR-07).
   */
  commentWhere(viewerId: string): Prisma.CommentWhereInput {
    return {
      deletedAt: null,
      author: this.userWhere(viewerId),
      OR: [{ hidden: false }, { authorId: viewerId }],
    }
  }

  /**
   * Like yang boleh dihitung dan ditampilkan: penyuka yang BANNED atau terhapus disembunyikan
   * seperti kontennya (BR-05).
   */
  likerWhere(viewerId?: string): Prisma.LikeWhereInput {
    return { user: this.userWhere(viewerId) }
  }

  /**
   * News feed (POST-04): post yang terlihat dan ditulis diri sendiri atau teman.
   * `friendIds` (id teman ACCEPTED viewer, dari FriendsService atau query pemanggil) hanya mempersempit
   * kandidat lewat indeks penulis/pemilik dinding; aturan privasi tetap dari `postWhere` (T-63: tanpa
   * daftar ini MySQL memindai seluruh tabel posts dengan subquery pertemanan per baris).
   */
  feedWhere(viewerId: string, friendIds?: string[]): Prisma.PostWhereInput {
    const circle = friendIds && [viewerId, ...friendIds]
    return {
      AND: [
        this.postWhere(viewerId),
        {
          OR: circle
            ? [{ authorId: { in: circle } }, { wallOwnerId: { in: circle } }]
            : [
                { authorId: viewerId },
                { author: this.friendOf(viewerId) },
                { wallOwnerId: viewerId },
                { wallOwner: this.friendOf(viewerId) },
              ],
        },
      ],
    }
  }
}
