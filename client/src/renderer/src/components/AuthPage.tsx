import { useState } from 'react'
import { useAuth } from '../store/auth'

export function AuthPage() {
  const login = useAuth((s) => s.login)
  const register = useAuth((s) => s.register)
  const pending = useAuth((s) => s.pending)
  const error = useAuth((s) => s.error)
  const clearError = useAuth((s) => s.clearError)

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (mode === 'login') {
        await login(username, password)
      } else {
        await register(username, password, displayName || username)
      }
    } catch {}
  }

  const switchMode = (next: 'login' | 'register') => {
    clearError()
    setMode(next)
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark">6&7</span>
          <h1>Messenger</h1>
        </div>
        <div className="tabs">
          <button className={mode === 'login' ? 'tab active' : 'tab'} onClick={() => switchMode('login')}>
            Sign in
          </button>
          <button className={mode === 'register' ? 'tab active' : 'tab'} onClick={() => switchMode('register')}>
            Create account
          </button>
        </div>
        <form onSubmit={submit}>
          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </label>
          {mode === 'register' && (
            <label>
              Display name
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
            </label>
          )}
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="primary" disabled={pending}>
            {pending ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
