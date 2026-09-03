export {}

declare global {
  interface Window {
    api: {
      platform: NodeJS.Platform
      getTokens: () => Promise<{ accessToken: string; refreshToken: string } | null>
      setTokens: (tokens: { accessToken: string; refreshToken: string }) => Promise<{ ok: boolean }>
      clearTokens: () => Promise<{ ok: boolean }>
    }
  }
}
