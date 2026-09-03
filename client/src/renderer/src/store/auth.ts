import { create } from 'zustand'
import { api } from '../api/client'
import type { PublicUser } from '../api/types'

interface AuthState {
  user: PublicUser | null
  accessToken: string | null
  refreshToken: string | null
  initialized: boolean
  pending: boolean
  error: string | null
  init: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: PublicUser) => void
  clearError: () => void
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  initialized: false,
  pending: false,
  error: null,

  init: async () => {
    const stored = await window.api.getTokens()
    if (!stored) {
      set({ initialized: true })
      return
    }
    try {
      const user = await api.me(stored.accessToken)
      set({ user, accessToken: stored.accessToken, refreshToken: stored.refreshToken, initialized: true })
    } catch {
      try {
        const refreshed = await api.refresh(stored.refreshToken)
        await window.api.setTokens({ accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken })
        set({
          user: refreshed.user,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          initialized: true
        })
      } catch {
        await window.api.clearTokens()
        set({ user: null, accessToken: null, refreshToken: null, initialized: true })
      }
    }
  },

  login: async (username, password) => {
    set({ pending: true, error: null })
    try {
      const res = await api.login(username, password)
      await window.api.setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken })
      set({ user: res.user, accessToken: res.accessToken, refreshToken: res.refreshToken })
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    } finally {
      set({ pending: false })
    }
  },

  register: async (username, password, displayName) => {
    set({ pending: true, error: null })
    try {
      const res = await api.register(username, password, displayName)
      await window.api.setTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken })
      set({ user: res.user, accessToken: res.accessToken, refreshToken: res.refreshToken })
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    } finally {
      set({ pending: false })
    }
  },

  logout: async () => {
    const { accessToken, refreshToken } = get()
    try {
      if (refreshToken) await api.logout(refreshToken, accessToken)
    } catch {}
    await window.api.clearTokens()
    set({ user: null, accessToken: null, refreshToken: null, error: null })
  },

  setUser: (user) => set({ user }),
  clearError: () => set({ error: null })
}))
