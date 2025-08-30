import { streamText } from "ai"
import { NextRequest } from "next/server"
import { model } from "@/lib/azure-openai"
import { sanitizeChatMessage } from "@/lib/sanitization"
import { handleAPIError, ErrorType } from "@/lib/error-handling"
import type { ChatMessage, MealPlan, UserProfile } from "@/lib/types"

export const runtime = "edge"

interface ChatRequest {
  message: string
  mealPlan: MealPlan
  userProfile: UserProfile
  chatHistory: ChatMessage[]
}

export async function POST(req: NextRequest) {
  try {
    console.log("Chat API called")
    const body = await req.json() as ChatRequest
    const { message, mealPlan, userProfile, chatHistory } = body
    console.log("Received message:", message)

    // Sanitize the user message
    const sanitizedMessage = sanitizeChatMessage(message)
    if (!sanitizedMessage) {
      console.log("Message sanitization failed")
      return new Response("Invalid message content", { status: 400 })
    }

    // Build context about the current meal plan
    const mealPlanContext = `
Current Meal Plan:
${mealPlan.meals.map(meal => 
  `Day ${meal.day} - ${meal.type}: ${meal.name}\n  Ingredients: ${meal.ingredients.join(", ")}\n  Calories: ${meal.estimatedCalories}\n`
).join("\n")}

User Profile:
- Age: ${userProfile.age}, Gender: ${userProfile.gender}
- Goals: ${userProfile.goals}
- Activity Level: ${userProfile.activityLevel}
- Dietary Restrictions: ${userProfile.dietaryRestrictions.join(", ") || "None"}
- Allergies: ${userProfile.allergies.join(", ") || "None"}
- Disliked Foods: ${userProfile.preferences.dislikedFoods.join(", ") || "None"}
`

    // Build chat history context
    const chatHistoryContext = chatHistory.length > 0 
      ? `\nRecent conversation:\n${chatHistory.slice(-6).map(msg => 
          `${msg.role}: ${msg.content}`
        ).join("\n")}\n`
      : ""

    // Create the system prompt for meal plan modification
    const systemPrompt = `You are a helpful AI nutritionist assistant helping users refine their meal plans. 

${mealPlanContext}
${chatHistoryContext}

The user wants to modify their meal plan. Your role is to:
1. Understand their request and take action to modify the meal plan
2. When they want to modify specific meals, say "I'll modify" or "I'll change" and explain what you're doing
3. Be encouraging and supportive
4. Keep responses concise but informative
5. Always indicate when you're taking action vs just giving suggestions

IMPORTANT: When the user requests changes (lighter, healthier, ingredient swaps, etc.), start your response with action phrases like:
- "I'll make this lighter by..."
- "I'll modify the [meal] to..."
- "I'll change the ingredients to..."
- "I'll adjust the portions..."

This tells the system to apply the actual changes to their meal plan.

Guidelines:
- Be conversational and friendly
- Reference specific meals when relevant
- Always use action language when making actual changes
- Consider their dietary restrictions and preferences
- Keep responses under 3 sentences when possible

User's request: ${sanitizedMessage}`

    // Stream the AI response
    console.log("Starting AI generation...")
    const result = await streamText({
      model,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: sanitizedMessage,
        },
      ],
      temperature: 0.7,
      maxTokens: 500,
    })

    console.log("AI generation successful, returning stream")
    return result.toTextStreamResponse()
  } catch (error) {
    console.error("Chat API error:", error)
    const appError = handleAPIError(error, { operation: "chat" })
    
    let status = 500
    if (appError.type === ErrorType.RATE_LIMIT) status = 429
    else if (appError.type === ErrorType.VALIDATION) status = 400
    else if (appError.type === ErrorType.SERVICE_UNAVAILABLE) status = 503

    return new Response(
      JSON.stringify({ error: appError.userMessage }),
      { 
        status,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
}