import { NextRequest, NextResponse } from 'next/server'
import { userProfilesDAO } from './data'
import { logger } from './error-handling'

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
}

/**
 * Extract user information from Microsoft authentication token
 * This would typically parse JWT token in a real implementation
 * For now, we'll expect the client to send user info in headers
 */
export function extractUserFromRequest(request: NextRequest): AuthenticatedUser | null {
  try {
    // In production, you'd validate JWT token here
    // For now, we'll use headers sent by the frontend
    const userId = request.headers.get('x-user-id')
    const userEmail = request.headers.get('x-user-email')
    const userName = request.headers.get('x-user-name')

    if (!userId || !userEmail) {
      return null
    }

    return {
      id: userId,
      email: userEmail,
      name: userName || userEmail
    }
  } catch (error) {
    logger.warn('Failed to extract user from request', { error })
    return null
  }
}

/**
 * Check if user profile exists and sync email if needed
 * Does NOT create profiles automatically - let the proper flow handle that
 */
export async function syncUserProfileEmail(user: AuthenticatedUser): Promise<void> {
  try {
    // Check if user profile already exists
    const existingProfile = await userProfilesDAO.getUserProfile(user.id)
    
    if (existingProfile) {
      // Update email if it changed (rare but possible)
      if (existingProfile.email !== user.email) {
        await userProfilesDAO.updateUserProfile(user.id, { email: user.email })
        logger.info('User email updated', { userId: user.id, newEmail: user.email })
      }
    }
    // If no profile exists, do nothing - let the user create it through the proper flow
  } catch (error: any) {
    logger.error(
      error instanceof Error ? error : new Error('Failed to sync user profile email'),
      { 
        userId: user.id, 
        email: user.email
      }
    )
    // Don't throw error for sync issues - just log them
  }
}

/**
 * Middleware wrapper for authenticated API routes
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      const user = extractUserFromRequest(request)
      
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Sync user profile email if profile exists
      await syncUserProfileEmail(user)

      return handler(request, user, ...args)
    } catch (error: any) {
      logger.error(error instanceof Error ? error : new Error('Authentication middleware error'))
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      )
    }
  }
}