import { NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { z } from "zod"
import { model } from "@/lib/azure-openai"
import { sanitizeChatMessage } from "@/lib/sanitization"
import { handleAPIError, ErrorType } from "@/lib/error-handling"
import { modifyMeal, regenerateMeal, regenerateShoppingList } from "@/lib/meal-generation"
import type { MealPlan, UserProfile, Meal } from "@/lib/types"

export const runtime = "edge"

// Schema for modification actions
const ModificationActionSchema = z.object({
  action: z.enum(["regenerate_meal", "modify_meal", "regenerate_plan", "no_action"]),
  targetMealId: z.string().optional(),
  targetMealType: z.enum(["breakfast", "lunch", "dinner"]).optional(),
  targetDay: z.number().min(1).max(3).optional(),
  modificationReason: z.string(),
  newMealRequirements: z.string().optional(),
})

interface ModifyRequest {
  message: string
  mealPlan: MealPlan
  userProfile: UserProfile
  aiChatResponse?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ModifyRequest
    const { message, mealPlan, userProfile, aiChatResponse } = body

    // Sanitize the user message
    const sanitizedMessage = sanitizeChatMessage(message)
    if (!sanitizedMessage) {
      return NextResponse.json({ error: "Invalid message content" }, { status: 400 })
    }

    // Build context about the current meal plan
    const mealPlanContext = `
Current Meal Plan:
${mealPlan.meals.map(meal => 
  `Day ${meal.day} - ${meal.type} (ID: ${meal.id}): ${meal.name}
  Description: ${meal.description}
  Ingredients: ${meal.ingredients.join(", ")}
  Calories: ${meal.estimatedCalories}
`).join("\n")}

User Profile:
- Age: ${userProfile.age}, Gender: ${userProfile.gender}
- Goals: ${userProfile.goals}
- Activity Level: ${userProfile.activityLevel}
- Dietary Restrictions: ${userProfile.dietaryRestrictions.join(", ") || "None"}
- Allergies: ${userProfile.allergies.join(", ") || "None"}
- Disliked Foods: ${userProfile.preferences.dislikedFoods.join(", ") || "None"}
`

    // Use AI to determine what action to take
    const result = await generateObject({
      model,
      system: `You are analyzing a user's request to modify their meal plan. Based on their message, determine what action should be taken.

${mealPlanContext}

Analyze the user's message and determine:
1. What action should be taken (regenerate_meal, modify_meal, regenerate_plan, or no_action)
2. Which specific meal they're referring to (if any)
3. What modifications they want

Guidelines:
- If they mention a specific meal type (breakfast, lunch, dinner) and day, target that meal
- If they say "lighter" or "healthier", use modify_meal
- If they say "I don't like [ingredient]", use modify_meal or regenerate_meal
- If they want to "start over" or "regenerate everything", use regenerate_plan
- If they're just asking questions or making general comments, use no_action

Be specific about the modification reason and requirements.${aiChatResponse ? `

AI Assistant's Response: "${aiChatResponse}"
Use this response to understand the specific changes the AI promised to make.` : ''}`,
      prompt: `User message: "${sanitizedMessage}"

Analyze this message and determine the appropriate action.`,
      schema: ModificationActionSchema,
      temperature: 0.3,
    })

    const { action, targetMealId, targetMealType, targetDay, modificationReason, newMealRequirements } = result.object

    // Execute the determined action
    let updatedMeals = [...mealPlan.meals]
    let updatedMeal: Meal | null = null

    if (action === "regenerate_meal" || action === "modify_meal") {
      // Find the target meal
      let targetMeal: Meal | undefined

      if (targetMealId) {
        targetMeal = mealPlan.meals.find(m => m.id === targetMealId)
      } else if (targetMealType && targetDay) {
        targetMeal = mealPlan.meals.find(m => m.type === targetMealType && m.day === targetDay)
      }

      if (targetMeal) {
        if (action === "modify_meal" && newMealRequirements) {
          // Use the modify function for specific changes
          updatedMeal = await modifyMeal(targetMeal, userProfile, newMealRequirements, aiChatResponse)
        } else {
          // Use regenerate for complete replacement
          const context = modificationReason || "User requested a new meal"
          updatedMeal = await regenerateMeal(targetMeal, userProfile, context)
        }

        // Update the meals array
        updatedMeals = mealPlan.meals.map(m => 
          m.id === targetMeal!.id ? updatedMeal! : m
        )
      }
    }

    // Generate new shopping list if meals were modified
    let newShoppingList = mealPlan.shoppingList
    if (updatedMeal) {
      newShoppingList = await regenerateShoppingList(updatedMeals, userProfile)
    }

    return NextResponse.json({
      action,
      targetMealId: updatedMeal?.id,
      modificationReason,
      updatedMeal,
      updatedMeals: updatedMeal ? updatedMeals : undefined,
      updatedShoppingList: updatedMeal ? newShoppingList : undefined,
    })

  } catch (error) {
    const appError = handleAPIError(error, { operation: "meal-plan-modification" })
    
    let status = 500
    if (appError.type === ErrorType.RATE_LIMIT) status = 429
    else if (appError.type === ErrorType.VALIDATION) status = 400
    else if (appError.type === ErrorType.SERVICE_UNAVAILABLE) status = 503

    return NextResponse.json(
      { error: appError.userMessage },
      { status }
    )
  }
}