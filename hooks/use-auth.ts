'use client'

import { useIsAuthenticated, useMsal, useAccount } from '@azure/msal-react'
import { AccountInfo } from '@azure/msal-browser'
import { useMemo } from 'react'

export function useAuth() {
  const isAuthenticated = useIsAuthenticated()
  const { accounts } = useMsal()
  const account = useAccount(accounts[0] || {}) as AccountInfo | null

  const user = useMemo(() => {
    return account
      ? {
          id: account.localAccountId,
          email: account.username,
          name: account.name || account.username,
        }
      : null
  }, [account?.localAccountId, account?.username, account?.name])

  return {
    isAuthenticated,
    account,
    user,
  }
}