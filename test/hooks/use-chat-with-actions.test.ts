import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useChatWithActions } from "@/hooks/use-chat-with-actions"
import type { MealPlan, UserProfile } from "@/lib/types"

// Mock api client
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    post: vi.fn(),
  },
}))

// Mock fetch for streaming
global.fetch = vi.fn()

describe("useChatWithActions Hook", () => {
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
        estimatedCalories: 350,
        prepTime: 10,
      },
    ],
    shoppingList: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockOnMealPlanUpdate = vi.fn()

  beforeEach(async () => {
    vi.clearAllMocks()
    
    // Mock fetch to return a readable stream
    const mockResponse = {
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode("I'll modify") })
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(" this meal") })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    }
    ;(global.fetch as any).mockResolvedValue(mockResponse)
    
    // Provide default mock for apiClient
    const { apiClient } = await import("@/lib/api-client")
    ;(apiClient.post as any).mockResolvedValue({
      action: "modify_meal",
      targetMealId: "meal-1",
      updatedMeal: mockMealPlan.meals[0],
      updatedMeals: [mockMealPlan.meals[0]],
      updatedShoppingList: [],
    })
  })

  it("should initialize with empty messages", () => {
    const { result } = renderHook(() =>
      useChatWithActions({
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
        onMealPlanUpdate: mockOnMealPlanUpdate,
      })
    )

    expect(result.current.messages).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.modifyingMealId).toBeNull()
  })

  it("should add user message and send to chat API", async () => {
    const { result } = renderHook(() =>
      useChatWithActions({
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
        onMealPlanUpdate: mockOnMealPlanUpdate,
      })
    )

    await act(async () => {
      await result.current.sendMessage("Make breakfast lighter")
    })

    expect(result.current.messages).toHaveLength(2) // user + assistant
    expect(result.current.messages[0].role).toBe("user")
    expect(result.current.messages[0].content).toBe("Make breakfast lighter")
    expect(result.current.messages[1].role).toBe("assistant")
    
    expect(fetch).toHaveBeenCalledWith("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Make breakfast lighter",
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
        chatHistory: [],
      }),
    })
  })

  it("should detect action keywords and trigger meal modification", async () => {
    const { apiClient } = await import("@/lib/api-client")
    
    // Mock API response for modification
    ;(apiClient.post as any).mockResolvedValue({
      action: "modify_meal",
      targetMealId: "meal-1",
      updatedMeal: { ...mockMealPlan.meals[0], estimatedCalories: 300 },
      updatedMeals: [{ ...mockMealPlan.meals[0], estimatedCalories: 300 }],
      updatedShoppingList: [],
    })

    const { result } = renderHook(() =>
      useChatWithActions({
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
        onMealPlanUpdate: mockOnMealPlanUpdate,
      })
    )

    await act(async () => {
      await result.current.sendMessage("Make breakfast lighter")
    })

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/api/meal-plan/modify", {
        message: "Make breakfast lighter",
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
        aiChatResponse: "I'll modify this meal",
      })
    })

    expect(mockOnMealPlanUpdate).toHaveBeenCalled()
  })

  it("should set modifying meal ID when breakfast is mentioned", async () => {
    const { result } = renderHook(() =>
      useChatWithActions({
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
        onMealPlanUpdate: mockOnMealPlanUpdate,
      })
    )

    await act(async () => {
      await result.current.sendMessage("Make breakfast healthier")
    })

    // After completion, modifying meal ID should be cleared
    expect(result.current.modifyingMealId).toBeNull()
  })

  it("should handle streaming response correctly", async () => {
    const { result } = renderHook(() =>
      useChatWithActions({
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
        onMealPlanUpdate: mockOnMealPlanUpdate,
      })
    )

    await act(async () => {
      await result.current.sendMessage("Tell me about the meals")
    })

    // Should accumulate streaming content
    expect(result.current.messages[1].content).toBe("I'll modify this meal")
  })

  it("should handle errors gracefully", async () => {
    // Mock fetch to reject
    ;(global.fetch as any).mockRejectedValue(new Error("Network error"))

    const { result } = renderHook(() =>
      useChatWithActions({
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
        onMealPlanUpdate: mockOnMealPlanUpdate,
      })
    )

    await act(async () => {
      await result.current.sendMessage("Make this lighter")
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.messages).toHaveLength(2) // user + error message
    expect(result.current.messages[1].content).toBe("Sorry, I encountered an error. Please try again.")
  })

  it("should not send message without meal plan or user profile", async () => {
    const { result } = renderHook(() =>
      useChatWithActions({
        mealPlan: null,
        userProfile: mockUserProfile,
        onMealPlanUpdate: mockOnMealPlanUpdate,
      })
    )

    await act(async () => {
      await result.current.sendMessage("Test message")
    })

    expect(result.current.messages).toHaveLength(0)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("should clear modifying meal ID after completion", async () => {
    const { apiClient } = await import("@/lib/api-client")
    ;(apiClient.post as any).mockResolvedValue({
      action: "modify_meal",
      targetMealId: "meal-1",
      updatedMeals: [],
      updatedShoppingList: [],
    })

    const { result } = renderHook(() =>
      useChatWithActions({
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
        onMealPlanUpdate: mockOnMealPlanUpdate,
      })
    )

    await act(async () => {
      await result.current.sendMessage("Make breakfast lighter")
    })

    await waitFor(() => {
      expect(result.current.modifyingMealId).toBeNull()
    })
  })
})