'use client'

import { useIsAuthenticated, useMsal, useAccount } from '@azure/msal-react'
import { AccountInfo } from '@azure/msal-browser'

export function useAuth() {
  const isAuthenticated = useIsAuthenticated()
  const { accounts } = useMsal()
  const account = useAccount(accounts[0] || {}) as AccountInfo | null

  return {
    isAuthenticated,
    account,
    user: account
      ? {
          id: account.localAccountId,
          email: account.username,
          name: account.name || account.username,
        }
      : null,
  }
}