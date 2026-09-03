import { create } from 'zustand'
import { api } from '../api/client'
import type { Chat, Message } from '../api/types'

interface ChatState {
  chats: Chat[]
  activeChatId: string | null
  messagesByChat: Record<string, Message[]>
  loadingChats: boolean
  loadingMessages: string | null
  error: string | null
  loadChats: (token: string) => Promise<void>
  openChat: (chatId: string, token: string) => Promise<void>
  createChatWith: (userId: string, token: string) => Promise<Chat>
  sendMessage: (chatId: string, body: string | null, files: File[], token: string) => Promise<void>
  togglePin: (chatId: string, messageId: string, pinned: boolean, token: string) => Promise<void>
  deleteMessage: (chatId: string, messageId: string, token: string) => Promise<void>
  upsertMessage: (message: Message) => void
  removeMessage: (messageId: string) => void
  upsertChat: (chat: Chat) => void
  setError: (error: string | null) => void
}

export const useChat = create<ChatState>((set, get) => ({
  chats: [],
  activeChatId: null,
  messagesByChat: {},
  loadingChats: false,
  loadingMessages: null,
  error: null,

  loadChats: async (token) => {
    set({ loadingChats: true })
    try {
      const chats = await api.listChats(token)
      set({ chats })
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ loadingChats: false })
    }
  },

  openChat: async (chatId, token) => {
    const existing = get().messagesByChat[chatId]
    if (existing && existing.length > 0) {
      set({ activeChatId: chatId })
      return
    }
    set({ activeChatId: chatId, loadingMessages: chatId })
    try {
      const messages = await api.listMessages(chatId, token)
      set((state) => ({ messagesByChat: { ...state.messagesByChat, [chatId]: messages } }))
    } catch (err) {
      set({ error: (err as Error).message })
    } finally {
      set({ loadingMessages: null })
    }
  },

  createChatWith: async (userId, token) => {
    const chat = await api.createDirectChat(userId, token)
    set((state) => {
      const exists = state.chats.some((c) => c.id === chat.id)
      return { chats: exists ? state.chats : [chat, ...state.chats] }
    })
    return chat
  },

  sendMessage: async (chatId, body, files, token) => {
    const message = await api.sendMessage(chatId, token, body, files)
    get().upsertMessage({ ...message, chatId })
  },

  togglePin: async (chatId, messageId, pinned, token) => {
    const message = await api.setPinned(chatId, messageId, pinned, token)
    get().upsertMessage({ ...message, chatId })
  },

  deleteMessage: async (chatId, messageId, token) => {
    await api.deleteMessage(chatId, messageId, token)
    get().removeMessage(messageId)
  },

  upsertMessage: (message) => {
    const chatId = message.chatId
    if (!chatId) return
    set((state) => {
      const list = state.messagesByChat[chatId] ?? []
      const idx = list.findIndex((m) => m.id === message.id)
      const next = idx >= 0 ? list.map((m, i) => (i === idx ? message : m)) : [...list, message]
      next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      const chats = state.chats.map((chat) => {
        if (chat.id !== chatId) return chat
        if (message.isPinned) {
          return { ...chat, lastMessage: message, updatedAt: message.updatedAt }
        }
        if (chat.lastMessage && message.id === chat.lastMessage.id) {
          return { ...chat, lastMessage: message, updatedAt: message.updatedAt }
        }
        return chat
      })
      return { messagesByChat: { ...state.messagesByChat, [chatId]: next }, chats }
    })
  },

  removeMessage: (messageId) => {
    set((state) => {
      const next: Record<string, Message[]> = {}
      for (const [chatId, list] of Object.entries(state.messagesByChat)) {
        next[chatId] = list.filter((m) => m.id !== messageId)
      }
      return { messagesByChat: next }
    })
  },

  upsertChat: (chat) => {
    set((state) => {
      const exists = state.chats.some((c) => c.id === chat.id)
      return { chats: exists ? state.chats.map((c) => (c.id === chat.id ? chat : c)) : [chat, ...state.chats] }
    })
  },

  setError: (error) => set({ error })
}))
