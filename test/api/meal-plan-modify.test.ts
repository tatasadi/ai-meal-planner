import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "@/app/api/meal-plan/modify/route"
import { NextRequest } from "next/server"
import type { MealPlan, UserProfile } from "@/lib/types"

// Mock the AI SDK
vi.mock("ai", () => ({
  generateObject: vi.fn(),
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

// Mock meal generation functions
vi.mock("@/lib/meal-generation", () => ({
  modifyMeal: vi.fn(),
  regenerateMeal: vi.fn(),
  regenerateShoppingList: vi.fn(),
}))

describe("Meal Plan Modify API Route", () => {
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
        ingredients: ["2 eggs", "1 slice bread", "10g butter"],
        estimatedCalories: 350,
        prepTime: 10,
      },
      {
        id: "meal-2", 
        day: 1,
        type: "lunch",
        name: "Test Lunch",
        description: "A test lunch meal",
        ingredients: ["100g chicken", "50g rice"],
        estimatedCalories: 400,
        prepTime: 20,
      },
    ],
    shoppingList: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should modify a meal when action is modify_meal", async () => {
    const { generateObject } = await import("ai")
    const { modifyMeal, regenerateShoppingList } = await import("@/lib/meal-generation")
    const { sanitizeChatMessage } = await import("@/lib/sanitization")

    const mockActionResult = {
      object: {
        action: "modify_meal",
        targetMealId: "meal-1",
        targetMealType: "breakfast",
        targetDay: 1,
        modificationReason: "User wants lighter breakfast",
        newMealRequirements: "reduce calories and make healthier",
      },
    }

    const mockModifiedMeal = {
      ...mockMealPlan.meals[0],
      name: "Light Test Breakfast",
      estimatedCalories: 250,
      ingredients: ["1 egg", "1 slice bread"],
    }

    const mockShoppingList = [
      { name: "Dairy", icon: "🥛", items: ["1 dozen eggs"] },
    ]

    ;(generateObject as any).mockResolvedValue(mockActionResult)
    ;(modifyMeal as any).mockResolvedValue(mockModifiedMeal)
    ;(regenerateShoppingList as any).mockResolvedValue(mockShoppingList)
    ;(sanitizeChatMessage as any).mockReturnValue("Make the breakfast lighter")

    const request = new NextRequest("http://localhost:3000/api/meal-plan/modify", {
      method: "POST",
      body: JSON.stringify({
        message: "Make the breakfast lighter",
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
        aiChatResponse: "I'll make this lighter by reducing eggs to 1",
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.action).toBe("modify_meal")
    expect(json.targetMealId).toBe("meal-1")
    expect(json.updatedMeal.name).toBe("Light Test Breakfast")
    expect(json.updatedMeal.estimatedCalories).toBe(250)
    expect(modifyMeal).toHaveBeenCalledWith(
      mockMealPlan.meals[0],
      mockUserProfile,
      "reduce calories and make healthier",
      "I'll make this lighter by reducing eggs to 1"
    )
  })

  it("should regenerate a meal when action is regenerate_meal", async () => {
    const { generateObject } = await import("ai")
    const { regenerateMeal, regenerateShoppingList } = await import("@/lib/meal-generation")
    const { sanitizeChatMessage } = await import("@/lib/sanitization")

    const mockActionResult = {
      object: {
        action: "regenerate_meal",
        targetMealId: "meal-2",
        targetMealType: "lunch",
        targetDay: 1,
        modificationReason: "User doesn't like chicken",
        newMealRequirements: undefined,
      },
    }

    const mockRegeneratedMeal = {
      ...mockMealPlan.meals[1],
      name: "Turkey Sandwich",
      ingredients: ["100g turkey", "2 slices bread"],
    }

    ;(generateObject as any).mockResolvedValue(mockActionResult)
    ;(regenerateMeal as any).mockResolvedValue(mockRegeneratedMeal)
    ;(regenerateShoppingList as any).mockResolvedValue([])
    ;(sanitizeChatMessage as any).mockReturnValue("I don't like chicken")

    const request = new NextRequest("http://localhost:3000/api/meal-plan/modify", {
      method: "POST",
      body: JSON.stringify({
        message: "I don't like chicken",
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.action).toBe("regenerate_meal")
    expect(json.updatedMeal.name).toBe("Turkey Sandwich")
    expect(regenerateMeal).toHaveBeenCalledWith(
      mockMealPlan.meals[1],
      mockUserProfile,
      "User doesn't like chicken"
    )
  })

  it("should handle no action when message is not actionable", async () => {
    const { generateObject } = await import("ai")
    const { sanitizeChatMessage } = await import("@/lib/sanitization")

    const mockActionResult = {
      object: {
        action: "no_action",
        targetMealId: undefined,
        targetMealType: undefined,
        targetDay: undefined,
        modificationReason: "User is just asking a question",
        newMealRequirements: undefined,
      },
    }

    ;(generateObject as any).mockResolvedValue(mockActionResult)
    ;(sanitizeChatMessage as any).mockReturnValue("How many calories should I eat?")

    const request = new NextRequest("http://localhost:3000/api/meal-plan/modify", {
      method: "POST",
      body: JSON.stringify({
        message: "How many calories should I eat?",
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.action).toBe("no_action")
    expect(json.updatedMeal).toBeNull()
    expect(json.updatedMeals).toBeUndefined()
  })

  it("should handle invalid message content", async () => {
    const { sanitizeChatMessage } = await import("@/lib/sanitization")
    ;(sanitizeChatMessage as any).mockReturnValue("")

    const request = new NextRequest("http://localhost:3000/api/meal-plan/modify", {
      method: "POST",
      body: JSON.stringify({
        message: "<script>alert('hack')</script>",
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe("Invalid message content")
  })

  it("should handle AI generation errors", async () => {
    const { generateObject } = await import("ai")
    const { sanitizeChatMessage } = await import("@/lib/sanitization")
    ;(generateObject as any).mockRejectedValue(new Error("AI service unavailable"))
    ;(sanitizeChatMessage as any).mockReturnValue("Make this lighter")

    const request = new NextRequest("http://localhost:3000/api/meal-plan/modify", {
      method: "POST",
      body: JSON.stringify({
        message: "Make this lighter",
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.error).toBe("Something went wrong")
  })

  it("should find target meal by type and day when no meal ID provided", async () => {
    const { generateObject } = await import("ai")
    const { modifyMeal } = await import("@/lib/meal-generation")
    const { sanitizeChatMessage } = await import("@/lib/sanitization")

    const mockActionResult = {
      object: {
        action: "modify_meal",
        targetMealId: undefined,
        targetMealType: "lunch",
        targetDay: 1,
        modificationReason: "User wants lighter lunch",
        newMealRequirements: "reduce portions",
      },
    }

    ;(generateObject as any).mockResolvedValue(mockActionResult)
    ;(modifyMeal as any).mockResolvedValue({
      ...mockMealPlan.meals[1],
      name: "Light Test Lunch",
    })
    ;(sanitizeChatMessage as any).mockReturnValue("Make lunch lighter")

    const request = new NextRequest("http://localhost:3000/api/meal-plan/modify", {
      method: "POST",
      body: JSON.stringify({
        message: "Make lunch lighter",
        mealPlan: mockMealPlan,
        userProfile: mockUserProfile,
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(modifyMeal).toHaveBeenCalledWith(
      mockMealPlan.meals[1], // lunch meal
      mockUserProfile,
      "reduce portions",
      undefined
    )
  })
})