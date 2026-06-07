import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from './types'
import { getMe, logout as apiLogout, deleteAccount as apiDeleteAccount } from './api'

interface AuthState {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  logout: async () => {},
  deleteAccount: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function logout() {
    await apiLogout().catch(() => {})
    setUser(null)
  }

  async function deleteAccount() {
    await apiDeleteAccount()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
