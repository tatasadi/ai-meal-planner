'use client'

import { useAuth } from '@/hooks/use-auth'
import { LoginButton } from './login-button'
import { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  fallback?: ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="text-muted-foreground mb-6">
              Please sign in to access your meal planner
            </p>
            <LoginButton />
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}