import { Injectable } from '@nestjs/common'
import { AppException } from '../../common/app-exception'
import { PrismaService } from '../../prisma/prisma.service'
import { UploadsService } from '../uploads/uploads.service'
import type { CreateAlbumDto } from './dto/album.dto'

@Injectable()
export class AlbumsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  async list(ownerId: number) {
    return this.prisma.album.findMany({
      where: { ownerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { photos: true } },
        photos: { take: 1, orderBy: { id: 'desc' }, select: { url: true } },
      },
    })
  }

  async listForProfile(viewerId: number, username: string) {
    const owner = await this.prisma.user.findFirst({
      where: {
        username,
        deletedAt: null,
        status: { not: 'BANNED' },
        NOT: {
          OR: [
            { blocksMade: { some: { blockedId: viewerId } } },
            { blocksReceived: { some: { blockerId: viewerId } } },
          ],
        },
      },
      select: {
        id: true,
        friendshipsSent: {
          where: { addresseeId: viewerId, status: 'ACCEPTED' },
          select: { id: true },
        },
        friendshipsReceived: {
          where: { requesterId: viewerId, status: 'ACCEPTED' },
          select: { id: true },
        },
      },
    })
    if (!owner) throw new AppException(404, 'NOT_FOUND', 'Pengguna tidak ditemukan')
    const isSelf = owner.id === viewerId
    const isFriend = owner.friendshipsSent.length > 0 || owner.friendshipsReceived.length > 0
    return this.prisma.album.findMany({
      where: {
        ownerId: owner.id,
        deletedAt: null,
        ...(isSelf
          ? {}
          : {
              OR: [{ privacy: 'PUBLIC' }, ...(isFriend ? [{ privacy: 'FRIENDS' as const }] : [])],
            }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { photos: true } },
        photos: { take: 1, orderBy: { id: 'desc' }, select: { url: true } },
      },
    })
  }

  async create(ownerId: number, dto: CreateAlbumDto) {
    const name = dto.name.trim()
    if (!name) throw new AppException(400, 'VALIDATION_FAILED', 'Nama album wajib diisi')
    return this.prisma.album.create({ data: { ownerId, name, privacy: dto.privacy ?? 'FRIENDS' } })
  }

  async get(viewerId: number, albumId: number) {
    const album = await this.prisma.album.findFirst({
      where: {
        id: albumId,
        deletedAt: null,
        owner: {
          deletedAt: null,
          status: { not: 'BANNED' },
          NOT: {
            OR: [
              { blocksMade: { some: { blockedId: viewerId } } },
              { blocksReceived: { some: { blockerId: viewerId } } },
            ],
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            friendshipsSent: {
              where: { addresseeId: viewerId, status: 'ACCEPTED' },
              select: { id: true },
            },
            friendshipsReceived: {
              where: { requesterId: viewerId, status: 'ACCEPTED' },
              select: { id: true },
            },
          },
        },
        photos: { orderBy: { id: 'desc' } },
      },
    })
    if (!album) throw new AppException(404, 'NOT_FOUND', 'Album tidak ditemukan')
    const isFriend =
      album.owner.friendshipsSent.length > 0 || album.owner.friendshipsReceived.length > 0
    if (
      (album.ownerId !== viewerId && album.privacy === 'ONLY_ME') ||
      (album.ownerId !== viewerId && album.privacy === 'FRIENDS' && !isFriend)
    )
      throw new AppException(404, 'NOT_FOUND', 'Album tidak ditemukan')
    const { owner, ...result } = album
    return result
  }

  async addPhotos(ownerId: number, albumId: number, files: Express.Multer.File[]) {
    const album = await this.prisma.album.findFirst({
      where: { id: albumId, ownerId, deletedAt: null },
    })
    if (!album) throw new AppException(404, 'NOT_FOUND', 'Album tidak ditemukan')
    if (!files?.length) throw new AppException(400, 'VALIDATION_FAILED', 'Pilih minimal satu foto')
    const urls = await Promise.all(files.map((file) => this.uploads.saveImage(file)))
    return this.prisma.photo
      .createMany({ data: urls.map((url) => ({ albumId, ownerId, url, caption: '' })) })
      .then(() =>
        this.prisma.photo.findMany({
          where: { albumId },
          orderBy: { id: 'desc' },
          take: urls.length,
        }),
      )
  }
}
