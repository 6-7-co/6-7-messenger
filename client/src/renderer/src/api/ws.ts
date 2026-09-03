import type { Chat, Message } from './types'

const WS_BASE = ((import.meta.env.VITE_API_URL as string) || 'http://localhost:3000').replace(/^http/, 'ws')

type WsHandler = (event: { type: string; data: unknown }) => void

class Socket {
  private ws: WebSocket | null = null
  private token: string | null = null
  private handlers = new Set<WsHandler>()
  private reconnectAttempts = 0
  private timer: ReturnType<typeof setTimeout> | null = null

  connect(token: string): void {
    this.token = token
    this.open()
  }

  disconnect(): void {
    if (this.timer) clearTimeout(this.timer)
    this.handlers.clear()
    this.ws?.close()
    this.ws = null
    this.token = null
  }

  subscribe(handler: WsHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  private open(): void {
    if (!this.token) return
    const url = `${WS_BASE}/ws?token=${encodeURIComponent(this.token)}`
    try {
      const ws = new WebSocket(url)
      this.ws = ws

      ws.onopen = () => {
        this.reconnectAttempts = 0
      }

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as { type: string; data: unknown }
          for (const handler of this.handlers) handler(payload)
        } catch {}
      }

      ws.onclose = () => {
        if (this.token) this.scheduleReconnect()
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    this.timer = setTimeout(() => {
      this.reconnectAttempts += 1
      if (this.reconnectAttempts <= 8) this.open()
    }, Math.min(1000 * 2 ** this.reconnectAttempts, 15000))
  }
}

export const socket = new Socket()

export function isChatEvent(event: { type: string; data: unknown }): event is { type: 'chat:new'; data: Chat } {
  return event.type === 'chat:new'
}

export function isMessageEvent(event: { type: string; data: unknown }): event is { type: 'message:new' | 'message:updated' | 'message:deleted'; data: Message } {
  return ['message:new', 'message:updated', 'message:deleted'].includes(event.type)
}
