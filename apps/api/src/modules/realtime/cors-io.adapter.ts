import { IoAdapter } from '@nestjs/platform-socket.io'
import type { ServerOptions } from 'socket.io'

/** Socket.IO punya CORS sendiri; samakan dengan REST (CORS_ORIGINS). */
export class CorsIoAdapter extends IoAdapter {
  constructor(
    app: ConstructorParameters<typeof IoAdapter>[0],
    private readonly origin: string[],
  ) {
    super(app)
  }

  createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, { ...options, cors: { origin: this.origin } })
  }
}
