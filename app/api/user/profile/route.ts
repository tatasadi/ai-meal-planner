import { NextRequest, NextResponse } from "next/server"
import { userProfilesDAO } from "@/lib/data"
import { UserProfileCreateSchema, UserProfileSchema } from "@/lib/schemas"
import { sanitizeUserProfile } from "@/lib/sanitization"
import { 
  handleAPIError, 
  logger, 
  monitorPerformance, 
  AppError, 
  ErrorType, 
  ErrorSeverity 
} from "@/lib/error-handling"
import { withAuth, extractUserFromRequest } from "@/lib/auth-middleware"

/**
 * Update user profile during onboarding/profile editing
 * POST /api/user/profile
 */
async function handleCreateOrUpdateProfile(request: NextRequest, user: any) {
  const performance = monitorPerformance("user-profile-update")
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    logger.info("User profile update started", { requestId, userId: user.id, email: user.email })
    
    // Parse and validate request body
    const body = await request.json()
    
    // Create a modified schema that doesn't require email (we get it from auth)
    const UpdateProfileSchema = UserProfileCreateSchema.omit({ email: true }).extend({
      email: UserProfileCreateSchema.shape.email.optional()
    })
    
    const validationResult = UpdateProfileSchema.safeParse(body)
    if (!validationResult.success) {
      const error = new AppError(
        "Invalid user profile data",
        ErrorType.VALIDATION,
        ErrorSeverity.LOW,
        {
          code: "VALIDATION_ERROR",
          context: { 
            requestId,
            userId: user.id,
            validationErrors: validationResult.error.issues,
          },
        }
      )
      logger.warn("User profile validation failed", { 
        requestId, 
        userId: user.id,
        errors: validationResult.error.issues 
      })
      return NextResponse.json(
        {
          error: error.userMessage,
          details: validationResult.error.issues,
        },
        { status: 400 }
      )
    }

    const profileData = validationResult.data

    // Prepare complete profile data using Microsoft auth data
    const completeProfileData = {
      id: user.id,
      email: user.email, // Use the email from Microsoft auth
      ...profileData,
    }

    // Sanitize user input before processing
    const sanitizedProfile = sanitizeUserProfile(completeProfileData)

    // Use upsertUserProfile to handle both create and replace operations
    // This avoids issues with partially corrupted profiles in the database
    const userProfile = await userProfilesDAO.upsertUserProfile(sanitizedProfile)
    logger.info("User profile saved", { requestId, userId: user.id })

    // Log successful completion
    const duration = performance.finish({ requestId, userId: user.id })
    logger.info("User profile operation completed successfully", { 
      requestId, 
      userId: user.id,
      email: user.email,
      duration: `${duration}ms`
    })

    // Return profile
    return NextResponse.json({
      ...userProfile,
      message: "Profile saved successfully"
    })

  } catch (error) {
    const appError = handleAPIError(error, { requestId, userId: user.id, operation: "user-profile-update" })
    performance.finish({ requestId, error: true })

    // Return appropriate HTTP status based on error type
    let status = 500
    if (appError.type === ErrorType.VALIDATION) status = 400
    else if (appError.type === ErrorType.SERVICE_UNAVAILABLE) status = 503

    return NextResponse.json(
      { 
        error: appError.userMessage,
        requestId,
        ...(process.env.NODE_ENV === "development" && { 
          details: appError.message,
          type: appError.type 
        })
      },
      { status }
    )
  }
}

export const POST = withAuth(handleCreateOrUpdateProfile)

/**
 * Get user profile
 * GET /api/user/profile
 */
async function handleGetProfile(request: NextRequest, user: any) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    logger.info("User profile retrieval started", { requestId, userId: user.id })

    const userProfile = await userProfilesDAO.getUserProfile(user.id)
    if (!userProfile) {
      return NextResponse.json(
        { error: "User profile not found. Please complete your profile setup." },
        { status: 404 }
      )
    }

    logger.info("User profile retrieved", { requestId, userId: user.id })
    return NextResponse.json(userProfile)

  } catch (error) {
    const appError = handleAPIError(error, { requestId, userId: user.id, operation: "user-profile-get" })
    
    return NextResponse.json(
      { 
        error: appError.userMessage,
        requestId 
      },
      { status: 500 }
    )
  }
}

export const GET = withAuth(handleGetProfile)

/**
 * Update user profile (partial updates)
 * PUT /api/user/profile
 */
async function handleUpdateProfile(request: NextRequest, user: any) {
  const performance = monitorPerformance("user-profile-partial-update")
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    logger.info("User profile partial update started", { requestId, userId: user.id })
    
    const body = await request.json()

    // Validate the updates (allow partial updates)
    const validationResult = UserProfileCreateSchema.omit({ email: true }).partial().safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid update data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      )
    }

    const updates = validationResult.data

    // Get existing profile first
    const existingProfile = await userProfilesDAO.getUserProfile(user.id)
    if (!existingProfile) {
      return NextResponse.json(
        { error: "User profile not found. Please create your profile first." },
        { status: 404 }
      )
    }

    // Merge updates with existing profile and sanitize
    const mergedProfile = {
      ...existingProfile,
      ...updates,
      id: user.id,
      email: user.email // Keep the email from Microsoft auth
    }

    const sanitizedProfile = sanitizeUserProfile(mergedProfile)
    const updatedProfile = await userProfilesDAO.updateUserProfile(user.id, sanitizedProfile)

    const duration = performance.finish({ requestId, userId: user.id })
    logger.info("User profile updated successfully", { 
      requestId, 
      userId: user.id,
      duration: `${duration}ms`
    })

    return NextResponse.json({
      ...updatedProfile,
      message: "Profile updated successfully"
    })

  } catch (error) {
    const appError = handleAPIError(error, { requestId, userId: user.id, operation: "user-profile-partial-update" })
    performance.finish({ requestId, error: true })
    
    return NextResponse.json(
      { 
        error: appError.userMessage,
        requestId 
      },
      { status: 500 }
    )
  }
}

export const PUT = withAuth(handleUpdateProfile)

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-user-id, x-user-email, x-user-name",
    },
  })
}