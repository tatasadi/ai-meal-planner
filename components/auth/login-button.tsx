'use client'

import { useMsal } from '@azure/msal-react'
import { loginRequest } from '@/lib/auth-config'
import { Button } from '@/components/ui/button'
import { LogIn } from 'lucide-react'

interface LoginButtonProps {
  children?: React.ReactNode
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

export function LoginButton({ children, className, variant = "default", size = "default" }: LoginButtonProps) {
  const { instance } = useMsal()

  const handleLogin = () => {
    instance.loginPopup(loginRequest).catch((e) => {
      console.error(e)
    })
  }

  return (
    <Button onClick={handleLogin} className={className} variant={variant} size={size}>
      {children || (
        <>
          <LogIn className="h-4 w-4 mr-2" />
          Sign in with Microsoft
        </>
      )}
    </Button>
  )
}