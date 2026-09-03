export interface PublicUser {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  createdAt: string
}

export interface Attachment {
  id: string
  url: string
  mimeType: string
  size: number
  filename: string
}

export interface Message {
  id: string
  body: string | null
  isPinned: boolean
  pinnedBy: string | null
  createdAt: string
  updatedAt: string
  chatId?: string
  sender: PublicUser
  attachments: Attachment[]
}

export interface Chat {
  id: string
  name: string | null
  isDirect: boolean
  createdAt: string
  updatedAt: string
  members: PublicUser[]
  lastMessage: Message | null
}

export interface AuthResponse {
  user: PublicUser
  accessToken: string
  refreshToken: string
}
