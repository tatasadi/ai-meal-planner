import { NextRequest, NextResponse } from "next/server"
import { groceryListsDAO, mealPlansDAO } from "@/lib/data"
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
 * Get grocery list for a meal plan
 * GET /api/grocery-list?mealPlanId=<id>
 */
async function handleGetGroceryList(request: NextRequest, user: any) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    logger.info("Grocery list retrieval started", { requestId, userId: user.id })
    
    const { searchParams } = new URL(request.url)
    const mealPlanId = searchParams.get('mealPlanId')
    
    if (!mealPlanId) {
      return NextResponse.json(
        { error: "mealPlanId is required" },
        { status: 400 }
      )
    }

    // Check if grocery list already exists for this user and meal plan
    let groceryList = await groceryListsDAO.getGroceryListByMealPlan(mealPlanId, user.id)
    
    if (!groceryList) {
      // Generate grocery list from meal plan
      const mealPlan = await mealPlansDAO.getMealPlan(mealPlanId, user.id)
      if (!mealPlan) {
        return NextResponse.json(
          { error: "Meal plan not found" },
          { status: 404 }
        )
      }

      // Verify the meal plan belongs to this user
      if (mealPlan.userId !== user.id) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        )
      }

      groceryList = await groceryListsDAO.generateFromMealPlan(mealPlanId, user.id, mealPlan.meals)
    }

    logger.info("Grocery list retrieved", { requestId, mealPlanId, userId: user.id })
    return NextResponse.json(groceryList)

  } catch (error) {
    const appError = handleAPIError(error, { requestId, userId: user.id, operation: "grocery-list-get" })
    
    return NextResponse.json(
      { 
        error: appError.userMessage,
        requestId 
      },
      { status: 500 }
    )
  }
}

export const GET = withAuth(handleGetGroceryList)

/**
 * Update grocery list (toggle items, add/remove items)
 * PUT /api/grocery-list
 */
async function handleUpdateGroceryList(request: NextRequest, user: any) {
  const performance = monitorPerformance("grocery-list-update")
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    logger.info("Grocery list update started", { requestId, userId: user.id })
    
    const body = await request.json()
    const { groceryListId, action, itemId, item } = body

    if (!groceryListId || !action) {
      return NextResponse.json(
        { error: "groceryListId and action are required" },
        { status: 400 }
      )
    }

    let updatedList
    
    switch (action) {
      case 'toggle':
        if (!itemId) {
          return NextResponse.json(
            { error: "itemId is required for toggle action" },
            { status: 400 }
          )
        }
        updatedList = await groceryListsDAO.toggleGroceryItem(groceryListId, user.id, itemId)
        break
        
      case 'add':
        if (!item) {
          return NextResponse.json(
            { error: "item is required for add action" },
            { status: 400 }
          )
        }
        updatedList = await groceryListsDAO.addGroceryItem(groceryListId, user.id, item)
        break
        
      case 'remove':
        if (!itemId) {
          return NextResponse.json(
            { error: "itemId is required for remove action" },
            { status: 400 }
          )
        }
        updatedList = await groceryListsDAO.removeGroceryItem(groceryListId, user.id, itemId)
        break
        
      default:
        return NextResponse.json(
          { error: "Invalid action. Supported actions: toggle, add, remove" },
          { status: 400 }
        )
    }

    const duration = performance.finish({ requestId, groceryListId, userId: user.id })
    logger.info("Grocery list updated successfully", { 
      requestId, 
      groceryListId,
      userId: user.id,
      action,
      duration: `${duration}ms`
    })

    return NextResponse.json({
      ...updatedList,
      message: "Grocery list updated successfully"
    })

  } catch (error) {
    const appError = handleAPIError(error, { requestId, userId: user.id, operation: "grocery-list-update" })
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

export const PUT = withAuth(handleUpdateGroceryList)

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-user-id, x-user-email, x-user-name",
    },
  })
}