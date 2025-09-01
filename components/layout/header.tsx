'use client'

import { useAuth } from '@/hooks/use-auth'
import { LoginButton } from '@/components/auth/login-button'
import { LogoutButton } from '@/components/auth/logout-button'
import { Navbar } from './navbar'
import { User } from 'lucide-react'
import Link from 'next/link'

export function Header() {
  const { isAuthenticated, user } = useAuth()

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-bold text-xl">
            AI Meal Planner
          </Link>
          <Navbar />
        </div>
        
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm">Hi, {user?.name || 'User'}</span>
              </div>
              <LogoutButton />
            </>
          ) : (
            <LoginButton />
          )}
        </div>
      </div>
    </header>
  )
}