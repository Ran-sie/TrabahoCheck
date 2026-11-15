import { useEffect, useState, type ReactNode } from 'react'
import { authApi, getToken, setToken } from '../lib/auth-api'
import { AuthContext } from '../lib/auth-context'
import type { User } from '../lib/types'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<'loading' | 'out' | 'in'>(() => (getToken() ? 'loading' : 'out'))

  // A saved login is checked once on load; an expired one is dropped quietly.
  useEffect(() => {
    const token = getToken()
    if (!token) return
    let cancelled = false
    authApi
      .me(token)
      .then(({ user }) => {
        if (cancelled) return
        setUser(user)
        setStatus('in')
      })
      .catch((e) => {
        if (cancelled) return
        // Only a rejected token ends the login; a network hiccup keeps it for next time.
        if (e?.problem === 'expired') setToken(null)
        setStatus('out')
      })
    return () => {
      cancelled = true
    }
  }, [])

  function logIn(token: string, next: User) {
    setToken(token)
    setUser(next)
    setStatus('in')
  }

  function logOut() {
    void authApi.logout().catch(() => {})
    setToken(null)
    setUser(null)
    setStatus('out')
  }

  return <AuthContext.Provider value={{ status, user, logIn, logOut, setUser }}>{children}</AuthContext.Provider>
}
