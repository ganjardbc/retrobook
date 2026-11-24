import { Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import type { Namespace, Socket } from 'socket.io'
import { PrismaService } from '../../prisma/prisma.service'
import { VisibilityService } from '../visibility/visibility.service'

export type ClientKind = 'WEB' | 'MOBILE'
export const userRoom = (id: number) => `user:${id}`

/**
 * Namespace `/realtime` (API spec 9). Token dicek saat connect dengan aturan yang sama seperti
 * JwtAuthGuard (akun terhapus, ditangguhkan, atau diblokir ditolak). Satu user = satu room
 * `user:<id>`; presence = ada minimal satu koneksi di room itu.
 */
@WebSocketGateway({ namespace: '/realtime' })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() private server!: Namespace
  private readonly log = new Logger(RealtimeGateway.name)

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly visibility: VisibilityService,
  ) {}

  afterInit(server: Namespace) {
    server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token
        if (typeof token !== 'string' || !token) throw new Error('no token')
        const { sub } = await this.jwt.verifyAsync<{ sub: number }>(token)
        const user = await this.prisma.user.findUnique({
          where: { id: sub },
          select: { id: true, status: true, deletedAt: true },
        })
        if (!user || user.deletedAt || user.status !== 'ACTIVE') throw new Error('inactive')
        socket.data.userId = user.id
        socket.data.client = (
          socket.handshake.auth?.client === 'mobile' ? 'MOBILE' : 'WEB'
        ) satisfies ClientKind
        next()
      } catch {
        next(new Error('UNAUTHORIZED'))
      }
    })
  }

  async handleConnection(socket: Socket) {
    const userId: number = socket.data.userId
    await socket.join(userRoom(userId))
    if ((await this.connectionCount(userId)) === 1) {
      await this.broadcastPresence(userId, true, socket.data.client as ClientKind)
    }
  }

  async handleDisconnect(socket: Socket) {
    const userId: number | undefined = socket.data.userId
    if (userId === undefined) return // gagal auth, tidak pernah terdaftar
    if ((await this.connectionCount(userId)) > 0) return
    try {
      await this.prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } })
      await this.broadcastPresence(userId, false)
    } catch (e) {
      this.log.warn(`presence offline gagal untuk user ${userId}: ${String(e)}`)
    }
  }

  /** Kirim event ke semua koneksi satu user (dipakai notifikasi, chat, poke). */
  emitToUser(userId: number, event: string, payload: unknown) {
    this.server.to(userRoom(userId)).emit(event, payload)
  }

  /** Koneksi aktif dan labelnya (Web atau Mobile) untuk satu user. */
  async clientsOf(userId: number): Promise<ClientKind[]> {
    const sockets = await this.server.in(userRoom(userId)).fetchSockets()
    return sockets.map((s) => s.data.client as ClientKind)
  }

  /**
   * Teman yang sedang online beserta labelnya, dari semua koneksi namespace ini (satu instance, R-06).
   * Label MOBILE hanya bila semua koneksi user itu mobile; selain itu WEB.
   */
  async onlineClients(userIds: number[]): Promise<Map<number, ClientKind>> {
    const wanted = new Set(userIds)
    const kinds = new Map<number, Set<ClientKind>>()
    for (const s of await this.server.fetchSockets()) {
      const id = s.data.userId as number | undefined
      if (id === undefined || !wanted.has(id)) continue
      kinds.set(id, (kinds.get(id) ?? new Set()).add(s.data.client as ClientKind))
    }
    return new Map(
      [...kinds].map(([id, k]) => [id, k.size === 1 && k.has('MOBILE') ? 'MOBILE' : 'WEB']),
    )
  }

  private async connectionCount(userId: number) {
    return (await this.server.in(userRoom(userId)).fetchSockets()).length
  }

  /** Presence hanya untuk teman ACCEPTED yang tidak saling blokir (BR-11). */
  private async broadcastPresence(userId: number, online: boolean, client?: ClientKind) {
    const friends = await this.prisma.user.findMany({
      where: { AND: [this.visibility.userWhere(userId), this.visibility.friendOf(userId)] },
      select: { id: true },
    })
    for (const f of friends)
      this.emitToUser(f.id, 'presence', { userId, online, ...(client ? { client } : {}) })
  }
}
