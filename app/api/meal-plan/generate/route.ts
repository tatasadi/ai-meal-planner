import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { generateMealPlan } from "@/lib/meal-generation"
import { MealPlanRequestSchema, UserProfileCreateSchema } from "@/lib/schemas"
import { sanitizeUserProfile } from "@/lib/sanitization"
import { mealPlansDAO, userProfilesDAO, groceryListsDAO } from "@/lib/data"
import { 
  handleAPIError, 
  logger, 
  monitorPerformance, 
  AppError, 
  ErrorType, 
  ErrorSeverity 
} from "@/lib/error-handling"
import { withAuth, extractUserFromRequest } from "@/lib/auth-middleware"

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Export for testing
export { rateLimitStore }

function getRateLimitKey(request: NextRequest, userId?: string): string {
  // Use user ID for rate limiting if available, otherwise fall back to IP
  if (userId) {
    return `meal-generation:user:${userId}`
  }
  
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0] : "127.0.0.1"
  return `meal-generation:ip:${ip}`
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour
  const maxRequests = parseInt(process.env.RATE_LIMIT_RPM || "60")
  
  const current = rateLimitStore.get(key)
  
  if (!current || now > current.resetTime) {
    // Reset or initialize
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }
  
  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }
  
  current.count++
  rateLimitStore.set(key, current)
  return { allowed: true, remaining: maxRequests - current.count }
}

// Main POST handler with authentication
async function handleMealPlanGeneration(request: NextRequest, user: any) {
  const performance = monitorPerformance("meal-plan-generation")
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    logger.info("Meal plan generation started", { requestId, userId: user.id, email: user.email })
    
    // Rate limiting (now using user ID)
    const rateLimitKey = getRateLimitKey(request, user.id)
    const rateLimit = checkRateLimit(rateLimitKey)
    
    if (!rateLimit.allowed) {
      const error = new AppError(
        "Rate limit exceeded",
        ErrorType.RATE_LIMIT,
        ErrorSeverity.MEDIUM,
        {
          code: "RATE_LIMIT_EXCEEDED",
          context: { rateLimitKey, requestId, userId: user.id },
        }
      )
      logger.warn("Rate limit exceeded", { requestId, rateLimitKey, userId: user.id })
      return NextResponse.json(
        { error: error.userMessage },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    
    const validationResult = MealPlanRequestSchema.safeParse(body)
    if (!validationResult.success) {
      const error = new AppError(
        "Invalid request data",
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
      logger.warn("Request validation failed", { 
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

    const { userProfile } = validationResult.data

    // Get user profile from database (should exist from auth middleware)
    const existingProfile = await userProfilesDAO.getUserProfile(user.id)
    
    if (!existingProfile) {
      const error = new AppError(
        "User profile not found. Please complete your profile setup.",
        ErrorType.VALIDATION,
        ErrorSeverity.MEDIUM,
        {
          code: "USER_PROFILE_NOT_FOUND",
          context: { userId: user.id, requestId }
        }
      )
      logger.warn("User profile not found", { userId: user.id, requestId })
      return NextResponse.json(
        { error: error.userMessage },
        { status: 404 }
      )
    }

    // Use the stored profile data, but allow overriding preferences from the request
    const profileForGeneration = {
      ...existingProfile,
      preferences: {
        ...existingProfile.preferences,
        ...(userProfile?.preferences || {}) // Allow updating preferences for this generation
      }
    }

    // Sanitize the profile
    const sanitizedProfile = sanitizeUserProfile(profileForGeneration)

    // Generate the meal plan
    const generatedMealPlan = await generateMealPlan(sanitizedProfile, user.id)

    // Save meal plan to database
    const savedMealPlan = await mealPlansDAO.createMealPlan({
      userId: user.id,
      title: generatedMealPlan.title,
      duration: generatedMealPlan.duration,
      meals: generatedMealPlan.meals,
      shoppingList: generatedMealPlan.shoppingList
    })

    logger.info("Meal plan saved to database", { 
      userId: user.id, 
      requestId, 
      mealPlanId: savedMealPlan.id 
    })

    // Create grocery list from meal plan and save to database
    let groceryList = null
    try {
      groceryList = await groceryListsDAO.generateFromMealPlan(
        savedMealPlan.id, 
        user.id, 
        savedMealPlan.meals
      )
      
      logger.info("Grocery list created and saved to database", { 
        userId: user.id, 
        requestId, 
        mealPlanId: savedMealPlan.id,
        groceryListId: groceryList.id,
        itemCount: groceryList.items.length
      })
    } catch (error: any) {
      logger.warn("Failed to create grocery list", { 
        userId: user.id, 
        requestId, 
        mealPlanId: savedMealPlan.id,
        error: error.message 
      })
      // Don't fail the whole request if grocery list creation fails
    }

    // Log successful completion
    const duration = performance.finish({ requestId, mealPlanId: savedMealPlan.id })
    logger.info("Meal plan generated successfully", { 
      requestId, 
      userId: user.id,
      mealPlanId: savedMealPlan.id, 
      duration: `${duration}ms`,
      mealCount: savedMealPlan.meals.length,
      groceryListId: groceryList?.id,
      groceryItemCount: groceryList?.items.length 
    })

    // Add rate limit headers and include grocery list ID in response
    const mealPlanResponse = {
      ...savedMealPlan,
      groceryListId: groceryList?.id
    }
    
    const response = NextResponse.json(mealPlanResponse)
    response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString())
    response.headers.set("X-RateLimit-Limit", process.env.RATE_LIMIT_RPM || "60")
    response.headers.set("X-Request-ID", requestId)

    return response

  } catch (error) {
    const appError = handleAPIError(error, { requestId, userId: user.id, operation: "meal-plan-generation" })
    performance.finish({ requestId, error: true })

    // Return appropriate HTTP status based on error type
    let status = 500
    if (appError.type === ErrorType.RATE_LIMIT) status = 429
    else if (appError.type === ErrorType.VALIDATION) status = 400
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

// Export the authenticated version of the handler
export const POST = withAuth(handleMealPlanGeneration)

// Fallback handler for backward compatibility (temporary)
export async function POST_FALLBACK(request: NextRequest) {
  // Try to extract user from headers first
  const user = extractUserFromRequest(request)
  
  if (user) {
    // If we have user data, use the authenticated handler
    return handleMealPlanGeneration(request, user)
  }
  
  // Otherwise fall back to old behavior with temp users
  const performance = monitorPerformance("meal-plan-generation")
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    logger.info("Meal plan generation started (fallback mode)", { requestId })
    
    // Parse and validate request body
    const body = await request.json()
    
    const validationResult = MealPlanRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      )
    }

    const { userProfile, userId: providedUserId } = validationResult.data

    // Generate userId if not provided (backward compatibility)
    const userId = providedUserId || `temp-user-${Date.now()}`

    // Get existing user profile from database, or create if needed
    let existingProfile = await userProfilesDAO.getUserProfile(userId)
    
    if (!existingProfile && userProfile) {
      try {
        const completeProfile = {
          id: userId,
          email: `${userId}@example.com`,
          ...userProfile
        }
        const sanitizedProfile = sanitizeUserProfile(completeProfile)
        existingProfile = await userProfilesDAO.createUserProfile(sanitizedProfile)
        logger.info("User profile created during meal generation (fallback)", { userId, requestId })
      } catch (error: any) {
        existingProfile = null
        logger.error(error instanceof Error ? error : new Error("Failed to create user profile during meal generation"), { userId, requestId })
      }
    }

    if (!existingProfile) {
      return NextResponse.json(
        { error: "User profile not found and no profile data provided." },
        { status: 404 }
      )
    }

    const profileForGeneration = {
      ...existingProfile,
      preferences: {
        ...existingProfile.preferences,
        ...(userProfile?.preferences || {})
      }
    }

    const sanitizedProfile = sanitizeUserProfile(profileForGeneration)
    const generatedMealPlan = await generateMealPlan(sanitizedProfile, userId)

    const savedMealPlan = await mealPlansDAO.createMealPlan({
      userId,
      title: generatedMealPlan.title,
      duration: generatedMealPlan.duration,
      meals: generatedMealPlan.meals,
      shoppingList: generatedMealPlan.shoppingList
    })

    logger.info("Meal plan generated successfully (fallback)", { 
      requestId, 
      mealPlanId: savedMealPlan.id, 
      userId 
    })

    return NextResponse.json(savedMealPlan)

  } catch (error) {
    const appError = handleAPIError(error, { requestId, operation: "meal-plan-generation-fallback" })
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-user-id, x-user-email, x-user-name",
    },
  })
}