import { contextBridge, ipcRenderer } from 'electron'

interface StoredTokens {
  accessToken: string
  refreshToken: string
}

const api = {
  platform: process.platform,
  getTokens: async (): Promise<StoredTokens | null> => ipcRenderer.invoke('token:get'),
  setTokens: async (tokens: StoredTokens): Promise<{ ok: boolean }> => ipcRenderer.invoke('token:set', tokens),
  clearTokens: async (): Promise<{ ok: boolean }> => ipcRenderer.invoke('token:clear')
}

contextBridge.exposeInMainWorld('api', api)
