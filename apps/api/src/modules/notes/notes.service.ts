import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { AppException } from '../../common/app-exception'
import { PrismaService } from '../../prisma/prisma.service'
import { VisibilityService } from '../visibility/visibility.service'
import type { CreateNoteDto, UpdateNoteDto } from './dto/note.dto'

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
  ) {}

  listMine(userId: number) {
    return this.prisma.note.findMany({
      where: { authorId: userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  }

  async listProfile(viewerId: number, username: string) {
    const owner = await this.prisma.user.findFirst({
      where: { username, ...this.visibility.userWhere(viewerId) },
      select: { id: true },
    })
    if (!owner) throw this.notFound()
    const self = owner.id === viewerId
    const friend = await this.prisma.user.findFirst({
      where: { id: owner.id, ...this.visibility.friendOf(viewerId) },
      select: { id: true },
    })
    return this.prisma.note.findMany({
      where: {
        authorId: owner.id,
        deletedAt: null,
        ...(self
          ? {}
          : { OR: [{ privacy: 'PUBLIC' }, ...(friend ? [{ privacy: 'FRIENDS' as const }] : [])] }),
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async get(viewerId: number, id: number) {
    const note = await this.prisma.note.findFirst({
      where: { AND: [{ id, deletedAt: null }, this.visibleTo(viewerId)] },
    })
    if (!note) throw this.notFound()
    return note
  }

  async create(authorId: number, dto: CreateNoteDto) {
    const title = dto.title.trim()
    const body = dto.body.trim()
    if (!title || !body)
      throw new AppException(400, 'VALIDATION_FAILED', 'Judul dan isi note wajib diisi')
    return this.prisma.note.create({
      data: { authorId, title, body, privacy: dto.privacy ?? 'FRIENDS' },
    })
  }

  async update(authorId: number, id: number, dto: UpdateNoteDto) {
    await this.assertOwner(authorId, id)
    const data: Prisma.NoteUpdateInput = {}
    if (dto.title !== undefined) {
      if (!dto.title.trim())
        throw new AppException(400, 'VALIDATION_FAILED', 'Judul note wajib diisi')
      data.title = dto.title.trim()
    }
    if (dto.body !== undefined) {
      if (!dto.body.trim()) throw new AppException(400, 'VALIDATION_FAILED', 'Isi note wajib diisi')
      data.body = dto.body.trim()
    }
    if (dto.privacy !== undefined) data.privacy = dto.privacy
    return this.prisma.note.update({ where: { id }, data })
  }

  async remove(authorId: number, id: number) {
    await this.assertOwner(authorId, id)
    await this.prisma.note.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  private visibleTo(viewerId: number): Prisma.NoteWhereInput {
    return {
      OR: [
        { authorId: viewerId },
        { privacy: 'PUBLIC', author: this.visibility.userWhere(viewerId) },
        {
          privacy: 'FRIENDS',
          author: {
            AND: [this.visibility.userWhere(viewerId), this.visibility.friendOf(viewerId)],
          },
        },
      ],
    }
  }

  private async assertOwner(userId: number, id: number) {
    const note = await this.prisma.note.findFirst({
      where: { id, authorId: userId, deletedAt: null },
      select: { id: true },
    })
    if (!note) throw this.notFound()
  }

  private notFound() {
    return new AppException(404, 'NOT_FOUND', 'Note tidak ditemukan')
  }
}
