import { generateObject } from "ai"
import { z } from "zod"
import { model } from "./azure-openai"
import type { UserProfile, MealPlan, Meal } from "@/src/lib/types"

// Schema for AI-generated meal plan response
const MealPlanResponseSchema = z.object({
  title: z.string(),
  meals: z.array(z.object({
    day: z.number(),
    type: z.enum(["breakfast", "lunch", "dinner"]),
    name: z.string(),
    description: z.string(),
    ingredients: z.array(z.string()),
    estimatedCalories: z.number(),
    prepTime: z.number(),
  })),
})

// Helper function to calculate daily caloric needs
function calculateDailyCalories(profile: UserProfile): number {
  // Mifflin-St Jeor Equation for BMR
  let bmr: number
  if (profile.gender === "male") {
    bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5
  } else {
    bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161
  }

  // Activity level multipliers
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }

  const tdee = bmr * activityMultipliers[profile.activityLevel]

  // Adjust based on goals
  switch (profile.goals) {
    case "weight_loss":
      return Math.round(tdee - 500) // 500 calorie deficit
    case "weight_gain":
      return Math.round(tdee + 500) // 500 calorie surplus
    case "muscle_gain":
      return Math.round(tdee + 300) // 300 calorie surplus
    default:
      return Math.round(tdee) // maintenance
  }
}

// Generate meal plan prompt based on user profile
function createMealPlanPrompt(profile: UserProfile): string {
  const dailyCalories = calculateDailyCalories(profile)
  const caloriesPerMeal = Math.round(dailyCalories / 3)

  const restrictionsText = profile.dietaryRestrictions.length > 0
    ? `Dietary restrictions: ${profile.dietaryRestrictions.join(", ")}`
    : "No specific dietary restrictions"

  const allergiesText = profile.allergies.length > 0
    ? `Allergies: ${profile.allergies.join(", ")}`
    : "No known allergies"

  const dislikedFoodsText = profile.preferences.dislikedFoods.length > 0
    ? `Foods to avoid: ${profile.preferences.dislikedFoods.join(", ")}`
    : "No specific food dislikes"

  const cuisineText = profile.preferences.cuisineTypes.length > 0
    ? `Preferred cuisines: ${profile.preferences.cuisineTypes.join(", ")}`
    : "Any cuisine type"

  return `Generate a 3-day meal plan for a ${profile.age}-year-old ${profile.gender} with the following profile:

Physical Stats:
- Height: ${profile.height}cm
- Weight: ${profile.weight}kg  
- Activity Level: ${profile.activityLevel}
- Goal: ${profile.goals}

Dietary Information:
- ${restrictionsText}
- ${allergiesText}
- ${dislikedFoodsText}
- ${cuisineText}
- Meal Complexity: ${profile.preferences.mealComplexity}

Target: ${dailyCalories} calories per day (~${caloriesPerMeal} calories per meal)

Requirements:
- Generate exactly 9 meals (3 days × 3 meals per day)
- Each meal should be practical and achievable
- Include estimated prep time in minutes
- Provide detailed ingredient lists
- Ensure nutritional balance across the day
- Respect all dietary restrictions and allergies
- Avoid disliked foods
- Match the requested meal complexity level

Please create diverse, balanced meals that align with their health goals.`
}

// Generate a meal plan using Azure OpenAI
export async function generateMealPlan(
  userProfile: UserProfile,
  userId: string
): Promise<MealPlan> {
  try {
    const prompt = createMealPlanPrompt(userProfile)

    const { object } = await generateObject({
      model,
      schema: MealPlanResponseSchema,
      prompt,
      temperature: 0.7,
    })

    // Transform the AI response into our MealPlan format
    const meals: Meal[] = object.meals.map((meal, index) => ({
      id: `meal-${Date.now()}-${index}`,
      day: meal.day,
      type: meal.type,
      name: meal.name,
      description: meal.description,
      ingredients: meal.ingredients,
      estimatedCalories: meal.estimatedCalories,
      prepTime: meal.prepTime,
    }))

    const mealPlan: MealPlan = {
      id: `plan-${Date.now()}`,
      userId,
      title: object.title,
      duration: 3,
      meals,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    return mealPlan
  } catch (error) {
    console.error("Error generating meal plan:", error)
    throw new Error("Failed to generate meal plan. Please try again.")
  }
}

// Regenerate a specific meal
export async function regenerateMeal(
  meal: Meal,
  userProfile: UserProfile,
  context?: string
): Promise<Meal> {
  try {
    const dailyCalories = calculateDailyCalories(userProfile)
    const targetCalories = Math.round(dailyCalories / 3)

    const contextText = context ? `Additional context: ${context}` : ""

    const prompt = `Generate a replacement ${meal.type} meal for day ${meal.day} with these requirements:

User Profile:
- Age: ${userProfile.age}, Gender: ${userProfile.gender}
- Dietary restrictions: ${userProfile.dietaryRestrictions.join(", ") || "None"}
- Allergies: ${userProfile.allergies.join(", ") || "None"}  
- Foods to avoid: ${userProfile.preferences.dislikedFoods.join(", ") || "None"}
- Meal complexity: ${userProfile.preferences.mealComplexity}

Target: ~${targetCalories} calories
${contextText}

Create a different meal than "${meal.name}" that fits the user's profile and preferences.`

    const { object } = await generateObject({
      model,
      schema: z.object({
        name: z.string(),
        description: z.string(),
        ingredients: z.array(z.string()),
        estimatedCalories: z.number(),
        prepTime: z.number(),
      }),
      prompt,
      temperature: 0.8,
    })

    return {
      ...meal,
      id: `meal-${Date.now()}`,
      name: object.name,
      description: object.description,
      ingredients: object.ingredients,
      estimatedCalories: object.estimatedCalories,
      prepTime: object.prepTime,
    }
  } catch (error) {
    console.error("Error regenerating meal:", error)
    throw new Error("Failed to regenerate meal. Please try again.")
  }
}