import { createContext, useContext } from 'react'
import type { User } from './types'

export interface AuthValue {
  /** `loading` while a saved login is being checked on page load. */
  status: 'loading' | 'out' | 'in'
  user: User | null
  logIn: (token: string, user: User) => void
  logOut: () => void
  setUser: (user: User) => void
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
