import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { api, clearAuth, getToken, getUser, setToken, setUser } from './api'
import type { Role, User } from './types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (data: {
    name: string
    email: string
    password: string
    role: Role
  }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => getUser() as User | null)
  const [loading, setLoading] = useState<boolean>(!getUser())

  useEffect(() => {
    if (getUser()) {
      setLoading(false)
      return
    }
    if (!getToken()) {
      clearAuth()
      setLoading(false)
      return
    }
    api<User>('/auth/me')
      .then((me) => {
        setUser(me)
        setUserState(me)
      })
      .catch(() => {
        clearAuth()
        setUserState(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const res = (await api('/auth/login', {
      method: 'POST',
      body: { email, password },
    })) as { accessToken: string; user: User }
    setToken(res.accessToken)
    setUser(res.user)
    setUserState(res.user)
    return res.user
  }

  const register = async (data: {
    name: string
    email: string
    password: string
    role: Role
  }) => {
    await api('/auth/register', { method: 'POST', body: data })
  }

  const logout = () => {
    clearAuth()
    setUserState(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
