import { io, type Socket } from 'socket.io-client'
import { refreshSession } from '@/plugins/http'
import { session } from '@/helpers/session'

let socket: Socket | null = null

/**
 * Satu koneksi Socket.IO `/realtime` per tab (API spec 9). Dibuat saat pertama dipakai.
 * Token dibaca ulang tiap (re)connect; bila ditolak UNAUTHORIZED (access token kedaluwarsa),
 * sesi disegarkan sekali lalu mencoba lagi. Gagal lagi berarti berhenti, bukan mengulang terus.
 */
export function getSocket(): Socket {
  if (socket) return socket
  const s = io('/realtime', {
    transports: ['websocket'],
    auth: (cb) => cb({ token: session.accessToken, client: 'web' }),
  })
  let retried = false
  s.on('connect', () => (retried = false))
  s.on('connect_error', (err) => {
    if (err.message !== 'UNAUTHORIZED' || retried) return
    retried = true
    void refreshSession()
      .then((ok) => ok && s.connect())
      .catch(() => {})
  })
  socket = s
  return s
}

export function disconnectRealtime() {
  socket?.disconnect()
  socket = null
}
