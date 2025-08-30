import { useState } from "react"
import { useChat } from "@ai-sdk/react"
import type { ChatMessage, MealPlan, UserProfile } from "@/lib/types"

interface UseChatOptions {
  mealPlan: MealPlan | null
  userProfile: UserProfile | null
}

export function useChatHook({ mealPlan, userProfile }: UseChatOptions) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat({
    api: "/api/chat",
    body: {
      mealPlan,
      userProfile,
      chatHistory: chatMessages,
    },
    onFinish: (message) => {
      // Add the completed AI response to our chat history
      const assistantMessage: ChatMessage = {
        id: message.id,
        userId: userProfile?.id || "user-1",
        mealPlanId: mealPlan?.id || "plan-1",
        role: "assistant",
        content: message.content,
        timestamp: new Date(),
      }
      setChatMessages(prev => [...prev, assistantMessage])
    },
    onError: (error) => {
      console.error("Chat error:", error)
    },
  })

  const sendMessage = (message: string) => {
    if (!mealPlan || !userProfile) {
      console.error("Cannot send message: missing meal plan or user profile")
      return
    }

    // Add user message to our chat history
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: userProfile.id,
      mealPlanId: mealPlan.id,
      role: "user",
      content: message,
      timestamp: new Date(),
    }
    setChatMessages(prev => [...prev, userMessage])

    // Send to AI using the built-in handleSubmit
    const syntheticEvent = {
      preventDefault: () => {},
    } as React.FormEvent<HTMLFormElement>

    // Set the input and submit
    handleInputChange({ target: { value: message } } as React.ChangeEvent<HTMLInputElement>)
    setTimeout(() => handleSubmit(syntheticEvent), 0)
  }

  // Convert AI SDK messages to our ChatMessage format for display
  const displayMessages: ChatMessage[] = [
    ...chatMessages,
    ...messages.map(msg => ({
      id: msg.id,
      userId: userProfile?.id || "user-1",
      mealPlanId: mealPlan?.id || "plan-1",
      role: msg.role as "user" | "assistant",
      content: msg.content,
      timestamp: new Date(),
    }))
  ]

  return {
    messages: displayMessages,
    sendMessage,
    isLoading,
    error,
  }
}