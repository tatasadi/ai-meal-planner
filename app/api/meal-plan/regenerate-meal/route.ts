import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { regenerateMeal } from "@/src/lib/meal-generation"
import { UserProfileSchema } from "@/src/lib/schemas"

// Schema for regenerate meal request
const RegenerateMealSchema = z.object({
  meal: z.object({
    id: z.string(),
    day: z.number(),
    type: z.enum(["breakfast", "lunch", "dinner"]),
    name: z.string(),
    description: z.string(),
    ingredients: z.array(z.string()),
    estimatedCalories: z.number(),
    prepTime: z.number(),
  }),
  userProfile: UserProfileSchema,
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

    const { meal, userProfile, context } = validationResult.data

    // Create a complete UserProfile with required fields
    const completeProfile = {
      id: 'temp-user',
      email: 'temp@example.com',
      ...userProfile,
    }

    // Regenerate the meal
    const newMeal = await regenerateMeal(meal, completeProfile, context)

    return NextResponse.json(newMeal)

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