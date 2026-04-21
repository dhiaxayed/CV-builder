'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export interface User {
  id: string
  email: string
  name: string | null
  photoUrl: string | null
  tier: 'free' | 'pro'
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session')
      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          setUser({
            ...data.user,
            tier: data.user.tier === 'pro' ? 'pro' : 'free',
          })
        } else {
          setUser(null)
        }
      } else {
        // API returned error (likely DB not configured)
        setUser(null)
      }
    } catch (error) {
      console.error('[Auth] Error fetching session:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  useEffect(() => {
    refreshUser()
  }, [refreshUser])
  
  const signOut = async () => {
    try {
      await fetch('/api/auth/session', { method: 'DELETE' })
      setUser(null)
    } catch (error) {
      console.error('[Auth] Error signing out:', error)
    }
  }
  
  return (
    <AuthContext.Provider value={{ user, isLoading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
