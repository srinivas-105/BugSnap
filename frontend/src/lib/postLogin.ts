import { NavigateFunction } from 'react-router-dom'
import { Role } from './api'

export function homeRouteForRole(role: Role): string {
  if (role === 'admin') return '/admin'
  if (role === 'developer') return '/dev'
  return '/tester'
}

/**
 * Send the user to the right place after login/register/signup.
 * If this is their very first successful login, they see the intro video
 * first (automatically, no manual click needed) and land on their
 * role's home page right after.
 */
export function goAfterAuth(navigate: NavigateFunction, role: Role, isFirstLogin: boolean) {
  const home = homeRouteForRole(role)
  if (isFirstLogin) {
    navigate('/intro', { state: { next: home } })
  } else {
    navigate(home)
  }
}
