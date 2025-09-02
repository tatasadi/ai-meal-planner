import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { regenerateMeal, regenerateShoppingList } from "@/lib/meal-generation"
import { UserProfileSchema } from "@/lib/schemas"
import { sanitizeUserProfile } from "@/lib/sanitization"
import { mealPlansDAO, userProfilesDAO } from "@/lib/data"

// Schema for regenerate meal request
const RegenerateMealSchema = z.object({
  mealPlanId: z.string(),
  userId: z.string(),
  mealId: z.string(),
  context: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    
    const validationResult = RegenerateMealSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      )
    }

    const { mealPlanId, userId, mealId, context } = validationResult.data

    // Get the existing meal plan from database
    const mealPlan = await mealPlansDAO.getMealPlan(mealPlanId, userId)
    if (!mealPlan) {
      return NextResponse.json(
        { error: "Meal plan not found" },
        { status: 404 }
      )
    }

    // Find the meal to regenerate
    const mealToRegenerate = mealPlan.meals.find(m => m.id === mealId)
    if (!mealToRegenerate) {
      return NextResponse.json(
        { error: "Meal not found" },
        { status: 404 }
      )
    }

    // Get user profile from database
    const userProfile = await userProfilesDAO.getUserProfile(userId)
    if (!userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      )
    }

    // Sanitize user profile
    const sanitizedProfile = sanitizeUserProfile(userProfile)

    // Regenerate the meal
    const newMeal = await regenerateMeal(mealToRegenerate, sanitizedProfile, context)

    // Update the meal in the meal plan
    const updatedMealPlan = await mealPlansDAO.replaceMeal(mealPlanId, userId, mealId, newMeal)

    // Regenerate shopping list with updated meals
    const newShoppingList = await regenerateShoppingList(updatedMealPlan.meals, sanitizedProfile)

    // Update meal plan with new shopping list
    const finalMealPlan = await mealPlansDAO.updateMealPlan(mealPlanId, userId, {
      shoppingList: newShoppingList
    })

    return NextResponse.json({
      meal: newMeal,
      shoppingList: newShoppingList,
      mealPlan: finalMealPlan
    })

  } catch (error) {
    console.error("Meal regeneration error:", error)

    return NextResponse.json(
      { error: "Failed to regenerate meal. Please try again." },
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