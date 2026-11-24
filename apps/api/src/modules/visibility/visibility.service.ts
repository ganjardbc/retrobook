import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'

/**
 * SATU-SATUNYA tempat aturan visibilitas konten ditulis (CLAUDE.md, risiko R-03).
 * Semua query baca post HARUS memakai postWhere/feedWhere; jangan menulis filter privasi
 * ad hoc di controller, service lain, atau frontend.
 *
 * Aturan (BR-02, 03, 05, 07): post terlihat oleh `viewer` bila belum dihapus, penulisnya tidak
 * BANNED atau terhapus, dan (viewer adalah penulis, atau tidak hidden dan privasinya PUBLIC,
 * atau tidak hidden dan privasinya FRIENDS dan penulis berteman ACCEPTED dengan viewer).
 *
 * TODO(BR-11): blokir dua arah belum ada karena tabel `blocks` baru dibuat bersama fitur Block.
 */
@Injectable()
export class VisibilityService {
  /** Akun yang boleh muncul bagi orang lain: tidak terhapus dan tidak BANNED (BR-05). */
  userWhere(): Prisma.UserWhereInput {
    return { deletedAt: null, status: { not: 'BANNED' } }
  }

  /** Filter User: berteman (ACCEPTED, arah mana pun) dengan `viewerId`. */
  friendOf(viewerId: number): Prisma.UserWhereInput {
    return {
      OR: [
        { friendshipsSent: { some: { addresseeId: viewerId, status: 'ACCEPTED' } } },
        { friendshipsReceived: { some: { requesterId: viewerId, status: 'ACCEPTED' } } },
      ],
    }
  }

  postWhere(viewerId: number): Prisma.PostWhereInput {
    return {
      deletedAt: null,
      author: { deletedAt: null, status: { not: 'BANNED' } },
      OR: [
        { authorId: viewerId },
        { hidden: false, privacy: 'PUBLIC' },
        { hidden: false, privacy: 'FRIENDS', author: this.friendOf(viewerId) },
      ],
    }
  }

  /**
   * Komentar yang boleh dibaca (di atas syarat bahwa post induknya terlihat, lihat postWhere):
   * belum dihapus, penulisnya tidak BANNED/terhapus, dan tidak hidden kecuali milik viewer (BR-07).
   */
  commentWhere(viewerId: number): Prisma.CommentWhereInput {
    return {
      deletedAt: null,
      author: { deletedAt: null, status: { not: 'BANNED' } },
      OR: [{ hidden: false }, { authorId: viewerId }],
    }
  }

  /**
   * Like yang boleh dihitung dan ditampilkan: penyuka yang BANNED atau terhapus disembunyikan
   * seperti kontennya (BR-05).
   */
  likerWhere(): Prisma.LikeWhereInput {
    return { user: { deletedAt: null, status: { not: 'BANNED' } } }
  }

  /** News feed (POST-04): post yang terlihat dan ditulis diri sendiri atau teman. */
  feedWhere(viewerId: number): Prisma.PostWhereInput {
    return {
      AND: [
        this.postWhere(viewerId),
        { OR: [{ authorId: viewerId }, { author: this.friendOf(viewerId) }] },
      ],
    }
  }
}
