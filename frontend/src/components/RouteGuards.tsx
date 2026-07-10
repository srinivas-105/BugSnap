import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from '../state/auth'
import { usePlatformAuth } from '../state/platformAuth'
import { Role } from '../lib/api'
import { homeRouteForRole } from '../lib/postLogin'

export function RequireOrgAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { token, user } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/** Restrict a route to specific roles, redirecting anyone else to their own home page. */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { token, user } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  if (!user || !roles.includes(user.role)) {
    return <Navigate to={homeRouteForRole(user?.role || 'tester')} replace />
  }
  return <>{children}</>
}

export function RequirePlatformAuth({ children }: { children: ReactNode }) {
  const { token } = usePlatformAuth()
  if (!token) return <Navigate to="/platform-admin/login" replace />
  return <>{children}</>
}
