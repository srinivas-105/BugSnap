import { createContext, useContext, useMemo, useState, ReactNode } from 'react'
import { UserOut, OrganizationOut } from '../lib/api'

type AuthState = {
  token: string | null
  user: UserOut | null
  organization: OrganizationOut | null
  setAuth: (token: string, user: UserOut, org: OrganizationOut) => void
  clearAuth: () => void
}

const AuthCtx = createContext<AuthState | null>(null)

function readJSON<T>(key: string): T | null {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [user, setUser] = useState<UserOut | null>(() => readJSON<UserOut>('user'))
  const [organization, setOrganization] = useState<OrganizationOut | null>(() => readJSON<OrganizationOut>('organization'))

  const value = useMemo<AuthState>(
    () => ({
      token,
      user,
      organization,
      setAuth: (t, u, org) => {
        localStorage.setItem('token', t)
        localStorage.setItem('user', JSON.stringify(u))
        localStorage.setItem('organization', JSON.stringify(org))
        setToken(t)
        setUser(u)
        setOrganization(org)
      },
      clearAuth: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('organization')
        setToken(null)
        setUser(null)
        setOrganization(null)
      },
    }),
    [token, user, organization]
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
