'use client'

import { useAuth } from '@/hooks/use-auth'
import { LoginButton } from './login-button'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Zap } from 'lucide-react'

interface AuthButtonProps {
  redirectTo?: string
  children?: React.ReactNode
  className?: string
}

export function AuthButton({ redirectTo = '/onboarding', children, className }: AuthButtonProps) {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return (
      <Link href={redirectTo}>
        <Button size="lg" className={className}>
          {children || (
            <>
              <Zap className="w-5 h-5 mr-2" />
              Start Planning
            </>
          )}
        </Button>
      </Link>
    )
  }

  return (
    <LoginButton 
      size="lg" 
      className={className}
    >
      <Zap className="w-5 h-5 mr-2" />
      Sign in to Start Planning
    </LoginButton>
  )
}