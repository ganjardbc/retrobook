import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets'
import type { ChatMessage } from '@retrobook/shared'
import type { Socket } from 'socket.io'
import { AppException } from '../../common/app-exception'
import { MESSAGE_PER_USER, RateLimiter } from '../../common/rate-limit'
import { isId } from '../../common/uuid'
import { MAX_MESSAGE_LENGTH } from './dto/messages.dto'
import { MessagesService } from './messages.service'

type Ack<T> = ({ ok: true } & T) | { ok: false; code: string; message: string; retryAfter?: number }

const CLIENT_ID = /^[\w-]{1,64}$/

/**
 * Event klien ke server di namespace `/realtime` (API spec 9). Autentikasi dilakukan middleware
 * RealtimeGateway; setiap event tetap memeriksa pertemanan dan blokir lewat MessagesService.
 */
@WebSocketGateway({ namespace: '/realtime' })
export class MessagesGateway {
  constructor(
    private readonly messages: MessagesService,
    private readonly limiter: RateLimiter,
  ) {}

  @SubscribeMessage('message:send')
  send(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<Ack<{ message: ChatMessage }>> {
    const b = (body ?? {}) as { toUserId?: unknown; content?: unknown; clientId?: unknown }
    return this.ack(async () => {
      // Bucket yang sama dengan REST (BR-10): socket bukan jalan pintas melewati batas.
      this.limiter.check(MESSAGE_PER_USER, socket.data.userId)
      if (!isId(b.toUserId)) throw bad('toUserId tidak valid')
      if (typeof b.content !== 'string' || b.content.length > MAX_MESSAGE_LENGTH * 2)
        throw bad('Pesan tidak valid')
      if (
        b.clientId !== undefined &&
        (typeof b.clientId !== 'string' || !CLIENT_ID.test(b.clientId))
      ) {
        throw bad('clientId tidak valid')
      }
      const { message } = await this.messages.send(
        socket.data.userId,
        b.toUserId,
        b.content,
        b.clientId as string | undefined,
      )
      return { message }
    })
  }

  @SubscribeMessage('message:read')
  read(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: unknown,
  ): Promise<Ack<{ updated: number }>> {
    const fromUserId = (body as { fromUserId?: unknown } | null)?.fromUserId
    return this.ack(async () => {
      if (!isId(fromUserId)) throw bad('fromUserId tidak valid')
      return this.messages.markRead(socket.data.userId, fromUserId)
    })
  }

  /** Tanpa ack dan tanpa galat ke klien: payload buruk atau lawan yang tak boleh diajak chat diabaikan. */
  @SubscribeMessage('typing')
  async typing(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown): Promise<void> {
    const b = (body ?? {}) as { toUserId?: unknown; isTyping?: unknown }
    if (!isId(b.toUserId)) return
    if (typeof b.isTyping !== 'boolean') return
    await this.messages.typing(socket.data.userId, b.toUserId, b.isTyping)
  }

  private async ack<T extends object>(fn: () => Promise<T>): Promise<Ack<T>> {
    try {
      return { ok: true, ...(await fn()) }
    } catch (e) {
      if (e instanceof AppException) {
        const { message } = e.getResponse() as { message: string | string[] }
        return {
          ok: false,
          code: e.code,
          message: Array.isArray(message) ? message.join(' ') : message,
          ...(e.retryAfter !== undefined ? { retryAfter: e.retryAfter } : {}),
        }
      }
      return { ok: false, code: 'INTERNAL', message: 'Terjadi kesalahan' }
    }
  }
}

const bad = (message: string) => new AppException(400, 'VALIDATION_FAILED', message)
