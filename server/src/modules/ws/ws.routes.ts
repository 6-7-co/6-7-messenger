import type { FastifyInstance } from 'fastify'
import { subscribeToChatEvents, type ChatEvent } from './hub'
import { addConnection, sendToAll, startHeartbeat } from './connection'

export async function registerWs(app: FastifyInstance): Promise<void> {
  const heartbeat = startHeartbeat()
  app.addHook('onClose', async () => {
    clearInterval(heartbeat)
  })

  subscribeToChatEvents((event: ChatEvent) => {
    const payload = event.payload as { memberIds?: string[] }
    const memberIds = payload?.memberIds ?? []
    sendToAll(memberIds, { type: event.type, data: event.payload })
  })

  app.get('/ws', { websocket: true }, (socket, request) => {
    const query = request.query as { token?: string }
    const token = query.token ?? ''

    let userId: string
    try {
      const payload = app.jwt.verify<{ sub: string; type: string }>(token)
      if (payload.type !== 'access') {
        throw new Error('invalid')
      }
      userId = payload.sub
    } catch {
      socket.close(1008, 'Unauthorized')
      return
    }

    addConnection(socket, userId)
    socket.send(JSON.stringify({ type: 'ready', data: { userId } }))

    socket.on('message', (raw: Buffer) => {
      try {
        const parsed = JSON.parse(raw.toString())
        if (parsed?.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', data: { t: Date.now() } }))
        }
      } catch {
        socket.send(JSON.stringify({ type: 'error', data: { message: 'Invalid frame' } }))
      }
    })
  })
}
