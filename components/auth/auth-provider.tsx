'use client'

import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { msalConfig } from '@/lib/auth-config'
import { ReactNode } from 'react'

const msalInstance = new PublicClientApplication(msalConfig)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>
}