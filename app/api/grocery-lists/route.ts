import { NextRequest, NextResponse } from "next/server"
import { groceryListsDAO } from "@/lib/data"
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
 * Get user's grocery lists
 * GET /api/grocery-lists?limit=<number>
 */
async function handleGetGroceryLists(request: NextRequest, user: any) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    logger.info("Grocery lists retrieval started", { requestId, userId: user.id })
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const groceryLists = await groceryListsDAO.getUserGroceryLists(user.id, limit)
    
    logger.info("Grocery lists retrieved successfully", { 
      requestId, 
      userId: user.id,
      count: groceryLists.length 
    })
    
    return NextResponse.json(groceryLists)

  } catch (error) {
    const appError = handleAPIError(error, { requestId, userId: user.id, operation: "grocery-lists-get" })
    
    return NextResponse.json(
      { 
        error: appError.userMessage,
        requestId 
      },
      { status: 500 }
    )
  }
}

export const GET = withAuth(handleGetGroceryLists)

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