'use client'

import { useAuth } from './use-auth'
import { useCallback } from 'react'

/**
 * Custom hook for making authenticated API requests
 * Automatically adds Microsoft authentication headers
 */
export function useAuthFetch() {
  const { user, isAuthenticated } = useAuth()

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      if (!isAuthenticated || !user) {
        throw new Error('User not authenticated')
      }

      // Add authentication headers
      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
        'x-user-email': user.email,
        'x-user-name': user.name,
        ...options.headers,
      }

      return fetch(url, {
        ...options,
        headers,
      })
    },
    [isAuthenticated, user?.id, user?.email, user?.name]
  )

  return {
    authFetch,
    isAuthenticated,
    user,
  }
}

/**
 * Utility function for making authenticated API requests with error handling
 */
export async function makeAuthenticatedRequest(
  url: string, 
  options: RequestInit = {},
  user?: { id: string; email: string; name: string }
) {
  if (!user) {
    throw new Error('User authentication required')
  }

  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': user.id,
    'x-user-email': user.email,
    'x-user-name': user.name,
    ...options.headers,
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `Request failed with status ${response.status}`)
  }

  return response.json()
}