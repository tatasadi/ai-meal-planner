import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/chat/route"
import { NextRequest } from "next/server"
import type { ChatMessage, MealPlan, UserProfile } from "@/lib/types"

// Mock the AI SDK
vi.mock("ai", () => ({
  streamText: vi.fn(),
}))

// Mock Azure OpenAI
vi.mock("@/lib/azure-openai", () => ({
  model: "mocked-model",
}))

// Mock sanitization
vi.mock("@/lib/sanitization", () => ({
  sanitizeChatMessage: vi.fn(),
}))

// Mock error handling
vi.mock("@/lib/error-handling", () => ({
  handleAPIError: vi.fn((error: any) => ({
    type: "API_ERROR",
    userMessage: "Something went wrong",
  })),
  ErrorType: {
    RATE_LIMIT: "RATE_LIMIT",
    VALIDATION: "VALIDATION",
    SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  },
}))

describe("Chat API Route", () => {
  const mockUserProfile: UserProfile = {
    id: "test-user",
    email: "test@example.com",
    age: 30,
    gender: "male",
    height: 180,
    weight: 75,
    activityLevel: "moderate",
    dietaryRestrictions: [],
    allergies: [],
    goals: "maintenance",
    preferences: {
      cuisineTypes: [],
      dislikedFoods: [],
      mealComplexity: "moderate",
    },
  }

  const mockMealPlan: MealPlan = {
    id: "test-plan",
    userId: "test-user",
    title: "Test Meal Plan",
    duration: 3,
    meals: [
      {
        id: "meal-1",
        day: 1,
        type: "breakfast",
        name: "Test Breakfast",
        description: "A test breakfast meal",
        ingredients: ["2 eggs", "1 slice bread"],
        estimatedCalories: 300,
        prepTime: 10,
      },
    ],
    shoppingList: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockChatHistory: ChatMessage[] = [
    {
      id: "msg-1",
      userId: "test-user",
      mealPlanId: "test-plan",
      role: "user",
      content: "Make this lighter",
      timestamp: new Date(),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should handle valid chat request", async () => {
    const { streamText } = await import("ai")
    const { sanitizeChatMessage } = await import("@/lib/sanitization")
    const mockStream = {
      toTextStreamResponse: vi.fn(() => new Response("AI response")),
    }
    ;(streamText as any).mockResolvedValue(mockStream)
    ;(sanitizeChatMessage as any).mockReturnValue("Make the breakfast lighter")

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "Make the breakfast lighter",
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
        chatHistory: mockChatHistory,
      }),
    })

    const response = await POST(request)

    expect(streamText).toHaveBeenCalledWith({
      model: "mocked-model",
      system: expect.stringContaining("You are a helpful AI nutritionist"),
      messages: [{ role: "user", content: "Make the breakfast lighter" }],
      temperature: 0.7,
      maxTokens: 500,
    })
    expect(mockStream.toTextStreamResponse).toHaveBeenCalled()
  })

  it("should handle invalid message content", async () => {
    const { sanitizeChatMessage } = await import("@/lib/sanitization")
    ;(sanitizeChatMessage as any).mockReturnValueOnce("")

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "<script>alert('hack')</script>",
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
        chatHistory: [],
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const text = await response.text()
    expect(text).toBe("Invalid message content")
  })

  it("should include meal plan context in system prompt", async () => {
    const { streamText } = await import("ai")
    const { sanitizeChatMessage } = await import("@/lib/sanitization")
    const mockStream = {
      toTextStreamResponse: vi.fn(() => new Response("AI response")),
    }
    ;(streamText as any).mockResolvedValue(mockStream)
    ;(sanitizeChatMessage as any).mockReturnValue("Tell me about my meals")

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "Tell me about my meals",
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
        chatHistory: [],
      }),
    })

    await POST(request)

    const systemPrompt = (streamText as any).mock.calls[0][0].system
    expect(systemPrompt).toContain("Current Meal Plan:")
    expect(systemPrompt).toContain("Test Breakfast")
    expect(systemPrompt).toContain("User Profile:")
    expect(systemPrompt).toContain("Age: 30")
  })

  it("should handle AI generation errors", async () => {
    const { streamText } = await import("ai")
    const { sanitizeChatMessage } = await import("@/lib/sanitization")
    ;(streamText as any).mockRejectedValue(new Error("AI service unavailable"))
    ;(sanitizeChatMessage as any).mockReturnValue("Make this lighter")

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "Make this lighter",
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
        chatHistory: [],
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.error).toBe("Something went wrong")
  })

  it("should include chat history in system prompt", async () => {
    const { streamText } = await import("ai")
    const { sanitizeChatMessage } = await import("@/lib/sanitization")
    const mockStream = {
      toTextStreamResponse: vi.fn(() => new Response("AI response")),
    }
    ;(streamText as any).mockResolvedValue(mockStream)
    ;(sanitizeChatMessage as any).mockReturnValue("Continue with modifications")

    const request = new NextRequest("http://localhost:3000/api/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "Continue with modifications",
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
        chatHistory: mockChatHistory,
      }),
    })

    await POST(request)

    const systemPrompt = (streamText as any).mock.calls[0][0].system
    expect(systemPrompt).toContain("Recent conversation:")
    expect(systemPrompt).toContain("user: Make this lighter")
  })
})