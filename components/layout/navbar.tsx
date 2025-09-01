'use client'

import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function Navbar() {
  const { isAuthenticated } = useAuth()
  const pathname = usePathname()

  if (!isAuthenticated) {
    return null // Don't show navigation for unauthenticated users
  }

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
    },
    {
      href: '/onboarding',
      label: 'Profile',
    },
  ]

  return (
    <nav className="hidden md:flex items-center gap-6">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            pathname === item.href
              ? 'text-primary'
              : 'text-muted-foreground'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}