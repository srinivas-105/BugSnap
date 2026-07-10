import { createContext, useContext, useMemo, useState, ReactNode } from 'react'

interface PlatformAdminInfo {
  id: string
  name: string
  email: string
}

type PlatformAuthState = {
  token: string | null
  admin: PlatformAdminInfo | null
  setAuth: (token: string, admin: PlatformAdminInfo) => void
  clearAuth: () => void
}

const Ctx = createContext<PlatformAuthState | null>(null)

function readJSON<T>(key: string): T | null {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('platform_token'))
  const [admin, setAdmin] = useState<PlatformAdminInfo | null>(() => readJSON<PlatformAdminInfo>('platform_admin'))

  const value = useMemo<PlatformAuthState>(
    () => ({
      token,
      admin,
      setAuth: (t, a) => {
        localStorage.setItem('platform_token', t)
        localStorage.setItem('platform_admin', JSON.stringify(a))
        setToken(t)
        setAdmin(a)
      },
      clearAuth: () => {
        localStorage.removeItem('platform_token')
        localStorage.removeItem('platform_admin')
        setToken(null)
        setAdmin(null)
      },
    }),
    [token, admin]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePlatformAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePlatformAuth must be used within PlatformAuthProvider')
  return ctx
}
