import { generateText } from "ai"
import { z } from "zod"
import { model } from "./azure-openai"
import type { UserProfile, MealPlan, Meal } from "@/lib/types"

// Shopping list categories template
const SHOPPING_LIST_FORMAT = `[
    {
      "name": "Produce",
      "icon": "🥬",
      "items": ["string - consolidated fresh fruits, vegetables, herbs with quantities"]
    },
    {
      "name": "Meat & Seafood", 
      "icon": "🥩",
      "items": ["string - consolidated meat, poultry, seafood with quantities"]
    },
    {
      "name": "Dairy & Eggs",
      "icon": "🥛", 
      "items": ["string - consolidated dairy products, eggs with quantities"]
    },
    {
      "name": "Pantry & Canned Goods",
      "icon": "🥫",
      "items": ["string - consolidated grains, pasta, rice, canned goods, dry goods with quantities (NOT bread or wraps)"]
    },
    {
      "name": "Spices & Seasonings",
      "icon": "🌿",
      "items": ["string - consolidated spices, herbs, seasonings with quantities"]
    },
    {
      "name": "Condiments & Oils",
      "icon": "🍯",
      "items": ["string - consolidated oils, vinegars, sauces, condiments with quantities"]
    },
    {
      "name": "Frozen",
      "icon": "🧊", 
      "items": ["string - consolidated frozen items with quantities"]
    },
    {
      "name": "Bakery",
      "icon": "🍞",
      "items": ["string - consolidated bread, wraps, tortillas, baked goods with quantities"]
    }
  ]

IMPORTANT: Only include categories that have items. Do not include empty categories in the response. Every ingredient from all meals must be categorized into one of these categories, but empty categories should be omitted.`

// Schema for AI-generated meal plan response
const MealPlanResponseSchema = z.object({
  title: z.string(),
  meals: z.array(
    z.object({
      day: z.number(),
      type: z.enum(["breakfast", "lunch", "dinner"]),
      name: z.string(),
      description: z.string(),
      ingredients: z.array(z.string()),
      estimatedCalories: z.number(),
      prepTime: z.number(),
    })
  ),
  shoppingList: z.array(
    z.object({
      name: z.string(),
      icon: z.string(),
      items: z.array(z.string()),
    })
  ),
})

// Helper function to clean AI response text and parse JSON
function parseAIResponse(text: string): any {
  // Clean the response text to handle markdown code blocks
  let cleanedText = text.trim()
  
  // Remove markdown code block markers if present
  if (cleanedText.startsWith('```json') || cleanedText.startsWith('```')) {
    const lines = cleanedText.split('\n')
    // Remove first line if it starts with ```
    if (lines[0].startsWith('```')) {
      lines.shift()
    }
    // Remove last line if it's just ```
    if (lines[lines.length - 1].trim() === '```') {
      lines.pop()
    }
    cleanedText = lines.join('\n')
  }
  
  return JSON.parse(cleanedText)
}

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

  const restrictionsText =
    profile.dietaryRestrictions.length > 0
      ? `Dietary restrictions: ${profile.dietaryRestrictions.join(", ")}`
      : "No specific dietary restrictions"

  const allergiesText =
    profile.allergies.length > 0
      ? `Allergies: ${profile.allergies.join(", ")}`
      : "No known allergies"

  const dislikedFoodsText =
    profile.preferences.dislikedFoods.length > 0
      ? `Foods to avoid: ${profile.preferences.dislikedFoods.join(", ")}`
      : "No specific food dislikes"

  const cuisineText =
    profile.preferences.cuisineTypes.length > 0
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
- Each meal should be practical and achievable with clear, descriptive names
- Provide detailed, appetizing descriptions for each meal
- Include estimated prep time in minutes
- Provide detailed ingredient lists with specific quantities using METRIC units (e.g., "200g spinach", "500g chicken breast", "30ml olive oil", "2 tbsp butter", "1 tsp salt")
- Ensure nutritional balance across the day
- Respect all dietary restrictions and allergies
- Avoid disliked foods
- Match the requested meal complexity level
- Generate a CONSOLIDATED shopping list that intelligently combines duplicate ingredients:
  * If multiple meals use "5ml olive oil" → combine to total amount needed
  * If you see "100g spinach" + "200g spinach" → combine to "300g fresh spinach"  
  * Use METRIC units: grams (g), kilograms (kg), milliliters (ml), liters (L), tablespoons (tbsp), teaspoons (tsp)
  * Convert to practical shopping amounts (e.g., "1.5kg" instead of "1500g")
  * Use realistic shopping language (e.g., "2 large tomatoes" not "400g diced tomatoes")
- Organize consolidated ingredients into exactly 8 predefined categories (see format below)
- CRITICAL: Every single ingredient from all meals must appear ONCE in the appropriate category after consolidation
- NO INGREDIENTS CAN BE MISSED - the shopping list must contain ALL ingredients needed to make every meal
- Only include categories that have items - omit empty categories from the response
- The shopping list should have fewer items than total ingredients due to consolidation, but must cover 100% of ingredients

Please create diverse, balanced meals that align with their health goals.

Respond with a JSON object in this exact format:
{
  "title": "string - descriptive title for the meal plan",
  "meals": [
    {
      "day": number,
      "type": "breakfast" | "lunch" | "dinner",
      "name": "string - descriptive meal name",
      "description": "string - detailed, appetizing description of the meal",
      "ingredients": ["string - ingredient with specific quantity using METRIC units (e.g., '200g spinach', '500g chicken breast', '30ml olive oil', '2 tbsp butter', '1 tsp salt')"],
      "estimatedCalories": number,
      "prepTime": number
    }
  ],
  "shoppingList": ${SHOPPING_LIST_FORMAT}
}`
}

// Generate a meal plan using Azure OpenAI
export async function generateMealPlan(
  userProfile: UserProfile,
  userId: string
): Promise<MealPlan> {
  try {
    const prompt = createMealPlanPrompt(userProfile)

    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.7,
    })

    // Parse the JSON response
    let parsedResponse
    try {
      parsedResponse = parseAIResponse(text)
    } catch (parseError) {
      console.error("Failed to parse AI response:", text)
      throw new Error("Invalid response format from AI")
    }

    // Validate with Zod schema
    const object = MealPlanResponseSchema.parse(parsedResponse)

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
      shoppingList: object.shoppingList,
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

Create a different meal than "${meal.name}" that fits the user's profile and preferences.
Provide a detailed, appetizing description and include specific quantities for all ingredients.

Respond with a JSON object in this exact format:
{
  "name": "string - descriptive meal name",
  "description": "string - detailed, appetizing description of the meal", 
  "ingredients": ["string - ingredient with specific quantity using METRIC units (e.g., '200g spinach', '500g chicken breast', '30ml olive oil', '2 tbsp butter', '1 tsp salt')"],
  "estimatedCalories": number,
  "prepTime": number
}`

    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.8,
    })

    // Parse the JSON response
    let parsedResponse
    try {
      parsedResponse = parseAIResponse(text)
    } catch (parseError) {
      console.error("Failed to parse AI response:", text)
      throw new Error("Invalid response format from AI")
    }

    // Validate with Zod schema
    const mealSchema = z.object({
      name: z.string(),
      description: z.string(),
      ingredients: z.array(z.string()),
      estimatedCalories: z.number(),
      prepTime: z.number(),
    })
    const object = mealSchema.parse(parsedResponse)

    return {
      ...meal,
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

// Regenerate shopping list for updated meal plan
export async function regenerateShoppingList(
  meals: Meal[],
  userProfile: UserProfile
): Promise<{ name: string; icon: string; items: string[] }[]> {
  try {
    const mealsText = meals.map(meal => 
      `Day ${meal.day} ${meal.type}: ${meal.name}\nIngredients: ${meal.ingredients.join(", ")}`
    ).join("\n\n")

    const allIngredients = meals.flatMap(meal => meal.ingredients)
    const uniqueIngredients = [...new Set(allIngredients)]

    const prompt = `Based on the following meal plan, generate a consolidated shopping list that combines duplicate ingredients with proper quantities:

${mealsText}

COMPLETE INGREDIENT LIST (${uniqueIngredients.length} total ingredients):
${uniqueIngredients.map((ing, i) => `${i + 1}. ${ing}`).join("\n")}

User dietary restrictions: ${userProfile.dietaryRestrictions.join(", ") || "None"}
User allergies: ${userProfile.allergies.join(", ") || "None"}

Create a CONSOLIDATED shopping list that intelligently combines duplicate ingredients:

CONSOLIDATION EXAMPLES:
- If you see: "5ml olive oil", "30ml olive oil", "5ml olive oil" → Combine to: "40ml olive oil"
- If you see: "100g spinach", "200g spinach" → Combine to: "300g fresh spinach"
- If you see: "500g chicken breast", "250g chicken breast" → Combine to: "750g chicken breast"
- If you see: "1 onion", "1/2 onion" → Combine to: "1.5 medium onions"

Requirements:
- CONSOLIDATE all duplicate ingredients by adding up quantities
- Use METRIC units: grams (g), kilograms (kg), milliliters (ml), liters (L), tablespoons (tbsp), teaspoons (tsp)
- Convert to practical shopping amounts (e.g., "1.5kg" instead of "1500g", "500ml" instead of "0.5L")
- Use realistic shopping language (e.g., "2 large tomatoes" instead of "400g diced tomatoes")
- Organize consolidated ingredients into exactly 8 predefined categories
- CRITICAL: Every single ingredient from the meal plan must appear ONCE in the appropriate category
- NO INGREDIENTS CAN BE MISSED - verify that every ingredient from all meals is included in the shopping list
- Only include categories that have items - omit empty categories from the response
- The final shopping list should have fewer items than the original ingredient list due to consolidation, but must cover 100% of ingredients
- VERIFICATION: Count total unique ingredients in meals vs shopping list items to ensure nothing is missing

Respond with a JSON object in this exact format:
{
  "shoppingList": ${SHOPPING_LIST_FORMAT}
}`

    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.5,
    })

    // Parse the JSON response
    let parsedResponse
    try {
      parsedResponse = parseAIResponse(text)
    } catch (parseError) {
      console.error("Failed to parse AI response:", text)
      throw new Error("Invalid response format from AI")
    }

    // Validate with Zod schema
    const shoppingListSchema = z.object({
      shoppingList: z.array(
        z.object({
          name: z.string(),
          icon: z.string(),
          items: z.array(z.string()),
        })
      ),
    })
    const object = shoppingListSchema.parse(parsedResponse)

    return object.shoppingList
  } catch (error) {
    console.error("Error regenerating shopping list:", error)
    throw new Error("Failed to regenerate shopping list. Please try again.")
  }
}
