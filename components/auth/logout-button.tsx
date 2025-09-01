'use client'

import { useMsal } from '@azure/msal-react'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  const { instance } = useMsal()

  const handleLogout = () => {
    instance.logoutPopup().catch((e) => {
      console.error(e)
    })
  }

  return (
    <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  )
}