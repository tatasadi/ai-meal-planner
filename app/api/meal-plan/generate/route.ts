import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { generateMealPlan } from "@/src/lib/meal-generation"
import { MealPlanRequestSchema } from "@/src/lib/schemas"

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
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request)
    const rateLimit = checkRateLimit(rateLimitKey)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      )
    }

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

    const { userProfile } = validationResult.data
    
    // Generate a temporary user ID for now (in production, get from auth)
    const userId = `temp-user-${Date.now()}`
    
    // Create a complete UserProfile with required fields
    const completeProfile = {
      id: userId,
      email: 'temp@example.com',
      ...userProfile,
    }

    // Generate the meal plan
    const mealPlan = await generateMealPlan(completeProfile, userId)

    // Add rate limit headers
    const response = NextResponse.json(mealPlan)
    response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString())
    response.headers.set("X-RateLimit-Limit", process.env.RATE_LIMIT_RPM || "60")

    return response

  } catch (error) {
    console.error("Meal plan generation error:", error)

    // Handle specific Azure OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes("Missing required Azure OpenAI environment variables")) {
        return NextResponse.json(
          { error: "Service configuration error. Please contact support." },
          { status: 500 }
        )
      }
      
      if (error.message.includes("quota") || error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Service temporarily unavailable. Please try again later." },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: "Failed to generate meal plan. Please try again." },
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
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}