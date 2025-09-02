import { NextRequest, NextResponse } from "next/server"
import { mealPlansDAO } from "@/lib/data"
import { 
  handleAPIError, 
  logger, 
  monitorPerformance, 
  AppError, 
  ErrorType, 
  ErrorSeverity 
} from "@/lib/error-handling"
import { withAuth } from "@/lib/auth-middleware"

/**
 * Get user's meal plans
 * GET /api/meal-plans?limit=<number>
 */
async function handleGetMealPlans(request: NextRequest, user: any) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    logger.info("Meal plans retrieval started", { requestId, userId: user.id })
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const mealPlans = await mealPlansDAO.getUserMealPlans(user.id, limit)
    
    logger.info("Meal plans retrieved successfully", { 
      requestId, 
      userId: user.id,
      count: mealPlans.length 
    })
    
    return NextResponse.json(mealPlans)

  } catch (error) {
    const appError = handleAPIError(error, { requestId, userId: user.id, operation: "meal-plans-get" })
    
    return NextResponse.json(
      { 
        error: appError.userMessage,
        requestId 
      },
      { status: 500 }
    )
  }
}

export const GET = withAuth(handleGetMealPlans)

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-user-id, x-user-email, x-user-name",
    },
  })
}