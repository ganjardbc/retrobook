import { Injectable } from '@nestjs/common'
import { AppException } from '../../common/app-exception'
import { NEWEST_FIRST } from '../../common/keyset'
import { PrismaService } from '../../prisma/prisma.service'
import { UploadsService } from '../uploads/uploads.service'
import { VisibilityService } from '../visibility/visibility.service'
import type { CreateAlbumDto } from './dto/album.dto'

@Injectable()
export class AlbumsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly visibility: VisibilityService,
  ) {}

  async list(ownerId: string) {
    return this.prisma.album.findMany({
      where: { ownerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { photos: true } },
        photos: { take: 1, orderBy: NEWEST_FIRST, select: { url: true } },
      },
    })
  }

  async listForProfile(viewerId: string, username: string) {
    const owner = await this.prisma.user.findFirst({
      where: { username, ...this.visibility.userWhere(viewerId) },
      select: { id: true },
    })
    if (!owner) throw new AppException(404, 'NOT_FOUND', 'Pengguna tidak ditemukan')
    return this.prisma.album.findMany({
      where: { AND: [{ ownerId: owner.id }, this.visibility.albumWhere(viewerId)] },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { photos: true } },
        photos: { take: 1, orderBy: NEWEST_FIRST, select: { url: true } },
      },
    })
  }

  async create(ownerId: string, dto: CreateAlbumDto) {
    const name = dto.name.trim()
    if (!name) throw new AppException(400, 'VALIDATION_FAILED', 'Nama album wajib diisi')
    return this.prisma.album.create({ data: { ownerId, name, privacy: dto.privacy ?? 'FRIENDS' } })
  }

  async get(viewerId: string, albumId: string) {
    const album = await this.prisma.album.findFirst({
      where: { AND: [{ id: albumId }, this.visibility.albumWhere(viewerId)] },
      include: { photos: { orderBy: NEWEST_FIRST } },
    })
    if (!album) throw new AppException(404, 'NOT_FOUND', 'Album tidak ditemukan')
    return album
  }

  async addPhotos(ownerId: string, albumId: string, files: Express.Multer.File[]) {
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
          orderBy: NEWEST_FIRST,
          take: urls.length,
        }),
      )
  }

  /** Soft delete (BR-06): album hilang dari semua query baca; berkas gambar dibiarkan (belum ada pembersihan). */
  async remove(ownerId: string, albumId: string) {
    const { count } = await this.prisma.album.updateMany({
      where: { id: albumId, ownerId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
    if (count === 0) throw new AppException(404, 'NOT_FOUND', 'Album tidak ditemukan')
  }

  async removePhoto(ownerId: string, albumId: string, photoId: string) {
    const { count } = await this.prisma.photo.deleteMany({
      where: { id: photoId, albumId, ownerId, album: { deletedAt: null } },
    })
    if (count === 0) throw new AppException(404, 'NOT_FOUND', 'Foto tidak ditemukan')
  }
}
