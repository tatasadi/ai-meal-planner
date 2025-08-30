import { useState } from "react"
import { apiClient } from "@/lib/api-client"
import type { ChatMessage, MealPlan, UserProfile, Meal } from "@/lib/types"

interface UseChatWithActionsOptions {
  mealPlan: MealPlan | null
  userProfile: UserProfile | null
  onMealPlanUpdate: (updatedMeals: Meal[], updatedShoppingList: any[]) => void
}

export function useChatWithActions({ 
  mealPlan, 
  userProfile, 
  onMealPlanUpdate 
}: UseChatWithActionsOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessingAction, setIsProcessingAction] = useState(false)
  const [modifyingMealId, setModifyingMealId] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const sendMessage = async (message: string) => {
    if (!mealPlan || !userProfile) {
      console.error("Cannot send message: missing meal plan or user profile")
      return
    }

    setError(null)
    setIsLoading(true)

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: userProfile.id,
      mealPlanId: mealPlan.id,
      role: "user",
      content: message,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])

    try {
      // Get streaming response
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          mealPlan,
          userProfile,
          chatHistory: messages,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Chat API error:", response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body")
      }

      let accumulatedContent = ""
      const assistantMessageId = `assistant-${Date.now()}`

      // Add initial assistant message
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        userId: userProfile.id,
        mealPlanId: mealPlan.id,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])

      // Read the text stream
      const decoder = new TextDecoder()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        console.log("Received chunk:", JSON.stringify(chunk))
        
        // For text streams, chunks come as plain text
        if (chunk) {
          accumulatedContent += chunk
          console.log("Accumulated content:", accumulatedContent)
          
          // Update the assistant message with accumulated content
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: accumulatedContent, isStreaming: true }
                : msg
            )
          )
        }
      }
      
      console.log("Final accumulated content:", accumulatedContent)
      console.log("Content length:", accumulatedContent.length)

      // Mark streaming as complete
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, isStreaming: false }
            : msg
        )
      )

      // Always check for actionable responses, even if content seems empty
      if (accumulatedContent.trim()) {
        console.log("AI chat response:", accumulatedContent)
        await checkForActionableResponse(accumulatedContent, userMessage)
      } else {
        console.log("No content received from AI - this might be a streaming parsing issue")
      }
      
      // Stop loading indicator after all processing is complete
      setIsLoading(false)


    } catch (error) {
      console.error("Chat hook error:", error)
      setError(error as Error)
      setIsLoading(false)
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        userId: userProfile.id,
        mealPlanId: mealPlan.id,
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const checkForActionableResponse = async (content: string, userMessage: ChatMessage) => {
    console.log("Checking for actionable response in:", content)
    
    // Check if the AI response suggests making actual changes
    const actionKeywords = [
      "I'll modify", "I'll change", "I'll make", "I'll adjust", "I'll replace", 
      "I'll regenerate", "let me update", "I'll reduce", "I'll increase",
      "I will modify", "I will change", "I will make", "I will adjust"
    ]
    
    const shouldTakeAction = actionKeywords.some(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    )

    console.log("Should take action:", shouldTakeAction)
    console.log("Has meal plan:", !!mealPlan)
    console.log("Has user profile:", !!userProfile)

    if (shouldTakeAction && mealPlan && userProfile) {
      setIsProcessingAction(true)
      
      // Try to predict which meal will be modified to show loading early
      const breakfastMeal = mealPlan.meals.find(m => m.type === "breakfast" && m.day === 1)
      const lunchMeal = mealPlan.meals.find(m => m.type === "lunch" && m.day === 1)
      const dinnerMeal = mealPlan.meals.find(m => m.type === "dinner" && m.day === 1)
      
      if (userMessage.content.toLowerCase().includes("breakfast")) {
        setModifyingMealId(breakfastMeal?.id || null)
      } else if (userMessage.content.toLowerCase().includes("lunch")) {
        setModifyingMealId(lunchMeal?.id || null)
      } else if (userMessage.content.toLowerCase().includes("dinner")) {
        setModifyingMealId(dinnerMeal?.id || null)
      }
      
      try {
        console.log("Calling modification API with message:", userMessage.content)
        const response = await apiClient.post("/api/meal-plan/modify", {
          message: userMessage.content,
          mealPlan,
          userProfile,
          aiChatResponse: content, // Pass the AI's chat response for consistency
        })

        console.log("Modification API response:", response)
        
        // Update the meal ID if it's different from our prediction
        if (response.targetMealId && response.targetMealId !== modifyingMealId) {
          console.log("Updating modifying meal ID from", modifyingMealId, "to", response.targetMealId)
          setModifyingMealId(response.targetMealId)
        }

        if (response.updatedMeals && response.updatedShoppingList) {
          console.log("Updating meal plan with new meals")
          console.log("Updated meal calories:", response.updatedMeals.map(m => `${m.name}: ${m.estimatedCalories} cal`))
          
          // Update the meal plan in the parent component
          onMealPlanUpdate(response.updatedMeals, response.updatedShoppingList)
          
          // System message will be handled by the UI component
        } else {
          console.log("No meal updates in response")
        }
      } catch (error) {
        console.error("Failed to execute meal modification:", error)
        
        // Error will be handled by the hook's error state
      } finally {
        setIsProcessingAction(false)
        setModifyingMealId(null) // Clear meal loading state
      }
    }
  }


  return {
    messages,
    sendMessage,
    isLoading,
    error,
    isProcessingAction,
    modifyingMealId,
  }
}