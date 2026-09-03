import { useEffect } from 'react'
import { useAuth } from './store/auth'
import { useChat } from './store/chat'
import { socket } from './api/ws'
import { AuthPage } from './components/AuthPage'
import { MainLayout } from './components/MainLayout'
import type { Chat, Message } from './api/types'

export default function App() {
  const user = useAuth((s) => s.user)
  const accessToken = useAuth((s) => s.accessToken)
  const initialized = useAuth((s) => s.initialized)
  const init = useAuth((s) => s.init)
  const logout = useAuth((s) => s.logout)
  const upsertMessage = useChat((s) => s.upsertMessage)
  const removeMessage = useChat((s) => s.removeMessage)
  const upsertChat = useChat((s) => s.upsertChat)
  const loadChats = useChat((s) => s.loadChats)

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (!accessToken) return
    socket.connect(accessToken)
    loadChats(accessToken)

    const unsubscribe = socket.subscribe((event) => {
      if (event.type === 'message:new' || event.type === 'message:updated') {
        upsertMessage(event.data as Message)
      } else if (event.type === 'message:deleted') {
        removeMessage((event.data as { id: string }).id)
      } else if (event.type === 'chat:new') {
        upsertChat(event.data as Chat)
      }
    })

    return () => {
      unsubscribe()
      socket.disconnect()
    }
  }, [accessToken, loadChats, upsertMessage, removeMessage, upsertChat])

  if (!initialized) {
    return <div className="boot">Loading…</div>
  }

  if (!user) {
    return <AuthPage />
  }

  return <MainLayout onLogout={logout} />
}
