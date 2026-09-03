import type { WebSocket } from '@fastify/websocket'

interface Connection {
  ws: WebSocket
  userId: string
  alive: boolean
}

const connections = new Map<WebSocket, Connection>()
const socketsByUser = new Map<string, Set<WebSocket>>()

const OPEN_STATE = 1
const HEARTBEAT_INTERVAL = 30_000

export function addConnection(ws: WebSocket, userId: string): void {
  const connection: Connection = { ws, userId, alive: true }
  connections.set(ws, connection)

  let set = socketsByUser.get(userId)
  if (!set) {
    set = new Set()
    socketsByUser.set(userId, set)
  }
  set.add(ws)

  ws.on('pong', () => {
    const conn = connections.get(ws)
    if (conn) conn.alive = true
  })

  ws.on('close', () => removeConnection(ws))
  ws.on('error', () => removeConnection(ws))
}

export function removeConnection(ws: WebSocket): void {
  const connection = connections.get(ws)
  if (!connection) return

  connections.delete(ws)
  const set = socketsByUser.get(connection.userId)
  if (set) {
    set.delete(ws)
    if (set.size === 0) socketsByUser.delete(connection.userId)
  }
}

export function sendToUser(userId: string, data: unknown): void {
  const set = socketsByUser.get(userId)
  if (!set) return
  const payload = JSON.stringify(data)
  for (const ws of set) {
    if (ws.readyState === OPEN_STATE) {
      ws.send(payload)
    }
  }
}

export function sendToAll(userId: string | string[], data: unknown): void {
  const ids = Array.isArray(userId) ? userId : [userId]
  for (const id of ids) {
    sendToUser(id, data)
  }
}

export function startHeartbeat(intervalMs = HEARTBEAT_INTERVAL): NodeJS.Timeout {
  return setInterval(() => {
    for (const [ws, connection] of connections) {
      if (!connection.alive) {
        ws.terminate()
        continue
      }
      connection.alive = false
      if (ws.readyState === OPEN_STATE) {
        ws.ping()
      }
    }
  }, intervalMs)
}

export function stopHeartbeat(timer: NodeJS.Timeout): void {
  clearInterval(timer)
}
