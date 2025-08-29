import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { generateMealPlan } from "@/lib/meal-generation"
import { MealPlanRequestSchema } from "@/lib/schemas"
import { sanitizeUserProfile } from "@/lib/sanitization"
import { 
  handleAPIError, 
  logger, 
  monitorPerformance, 
  AppError, 
  ErrorType, 
  ErrorSeverity 
} from "@/lib/error-handling"

// Rate limiting storage (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function getRateLimitKey(request: NextRequest): string {
  // In production, you might want to use user ID instead of IP
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0] : "127.0.0.1"
  return `meal-generation:${ip}`
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

export async function POST(request: NextRequest) {
  const performance = monitorPerformance("meal-plan-generation")
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    logger.info("Meal plan generation started", { requestId })
    
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request)
    const rateLimit = checkRateLimit(rateLimitKey)
    
    if (!rateLimit.allowed) {
      const error = new AppError(
        "Rate limit exceeded",
        ErrorType.RATE_LIMIT,
        ErrorSeverity.MEDIUM,
        {
          code: "RATE_LIMIT_EXCEEDED",
          context: { rateLimitKey, requestId },
        }
      )
      logger.warn("Rate limit exceeded", { requestId, rateLimitKey })
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
            validationErrors: validationResult.error.issues,
          },
        }
      )
      logger.warn("Request validation failed", { 
        requestId, 
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
    
    // Generate a temporary user ID for now (in production, get from auth)
    const userId = `temp-user-${Date.now()}`
    
    // Create a complete UserProfile with required fields
    const completeProfile = {
      id: userId,
      email: 'temp@example.com',
      ...userProfile,
    }

    // Sanitize user input before processing
    const sanitizedProfile = sanitizeUserProfile(completeProfile)

    // Generate the meal plan
    const mealPlan = await generateMealPlan(sanitizedProfile, userId)

    // Log successful completion
    const duration = performance.finish({ requestId, mealPlanId: mealPlan.id })
    logger.info("Meal plan generated successfully", { 
      requestId, 
      mealPlanId: mealPlan.id, 
      duration: `${duration}ms`,
      mealCount: mealPlan.meals.length 
    })

    // Add rate limit headers
    const response = NextResponse.json(mealPlan)
    response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString())
    response.headers.set("X-RateLimit-Limit", process.env.RATE_LIMIT_RPM || "60")
    response.headers.set("X-Request-ID", requestId)

    return response

  } catch (error) {
    const appError = handleAPIError(error, { requestId, operation: "meal-plan-generation" })
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}