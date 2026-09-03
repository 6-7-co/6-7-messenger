import type { AuthResponse, Chat, Message, PublicUser } from './types'

const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000'

export const FILE_BASE = API_BASE

interface RequestOptions {
  method?: string
  token?: string | null
  body?: unknown
  isForm?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', token = null, body, isForm = false } = options

  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (body && !isForm) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (isForm ? (body as FormData) : JSON.stringify(body)) : undefined
  })

  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    const message = (data as { error?: string })?.error ?? `Request failed (${response.status})`
    throw new ApiError(response.status, message)
  }

  return data as T
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

export const api = {
  register: (username: string, password: string, displayName: string) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: { username, password, displayName } }),
  login: (username: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: { username, password } }),
  refresh: (refreshToken: string) =>
    request<AuthResponse>('/auth/refresh', { method: 'POST', body: { refreshToken } }),
  logout: (refreshToken: string, token: string | null) =>
    request<{ ok: boolean }>('/auth/logout', { method: 'POST', token, body: { refreshToken } }),
  me: (token: string) => request<PublicUser>('/auth/me', { token }),

  searchUsers: (q: string, token: string) => request<PublicUser[]>(`/users/search?q=${encodeURIComponent(q)}`, { token }),
  updateAvatar: (file: File, token: string) => {
    const form = new FormData()
    form.append('avatar', file)
    return request<PublicUser>('/users/avatar', { method: 'POST', token, body: form, isForm: true })
  },

  listChats: (token: string) => request<Chat[]>('/chats', { token }),
  getChat: (chatId: string, token: string) => request<Chat>(`/chats/${chatId}`, { token }),
  createDirectChat: (userId: string, token: string) =>
    request<Chat>('/chats/direct', { method: 'POST', token, body: { userId } }),

  listMessages: (chatId: string, token: string, before?: string, limit = 50) => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (before) params.set('before', before)
    return request<Message[]>(`/messages/${chatId}?${params.toString()}`, { token })
  },
  sendMessage: (chatId: string, token: string, body: string | null, files: File[]) => {
    const form = new FormData()
    if (body) form.append('body', body)
    for (const file of files) form.append('files', file)
    return request<Message>(`/messages/${chatId}`, { method: 'POST', token, body: form, isForm: true })
  },
  setPinned: (chatId: string, messageId: string, pinned: boolean, token: string) =>
    request<Message>(`/messages/${chatId}/${messageId}`, { method: 'PATCH', token, body: { pinned } }),
  deleteMessage: (chatId: string, messageId: string, token: string) =>
    request<{ ok: boolean }>(`/messages/${chatId}/${messageId}`, { method: 'DELETE', token })
}

export function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path
  return `${FILE_BASE}${path}`
}
