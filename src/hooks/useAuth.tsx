import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { TOKEN_KEY, USER_KEY, postData } from '../lib/api'
import type { LoginResult } from '../lib/types'

interface AuthState {
  user: LoginResult | null
  isAdmin: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

function readStoredUser(): LoginResult | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw || !localStorage.getItem(TOKEN_KEY)) return null
    const parsed = JSON.parse(raw) as LoginResult
    // Treat an expired token as logged out so the UI doesn't flash protected screens.
    if (new Date(parsed.expiresAt).getTime() < Date.now()) return null
    return parsed
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoginResult | null>(readStoredUser)

  const login = useCallback(async (username: string, password: string) => {
    const response = await postData<LoginResult>('/auth/login', { username, password })
    const result = response.data
    localStorage.setItem(TOKEN_KEY, result.token)
    localStorage.setItem(USER_KEY, JSON.stringify(result))
    setUser(result)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  const value = useMemo<AuthState>(
    () => ({ user, isAdmin: user?.role === 'Admin', login, logout }),
    [user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
