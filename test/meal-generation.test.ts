import { describe, it, expect, vi, beforeEach } from "vitest"
import type { UserProfile } from "@/lib/types"

// Mock the AI SDK
vi.mock("ai", () => ({
  generateText: vi.fn(),
}))

// Mock the Azure OpenAI module to avoid requiring actual API keys during tests
vi.mock("@/lib/azure-openai", () => ({
  model: "mocked-model",
  azure: vi.fn(),
  AZURE_CONFIG: {
    endpoint: "https://test.openai.azure.com/",
    deploymentName: "gpt-4o",
    apiVersion: "2024-02-01",
    maxTokens: 4000,
    temperature: 0.7,
  },
}))

describe("Meal Generation", () => {
  const mockUserProfile: UserProfile = {
    id: "test-user",
    email: "test@example.com",
    age: 30,
    gender: "male",
    height: 180,
    weight: 75,
    activityLevel: "moderate",
    dietaryRestrictions: ["vegetarian"],
    allergies: [],
    goals: "maintenance",
    preferences: {
      cuisineTypes: ["mediterranean"],
      dislikedFoods: ["mushrooms"],
      mealComplexity: "moderate",
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("generateMealPlan", () => {
    it("should generate a valid meal plan structure", async () => {
      // Mock the generateText function
      const { generateText } = await import("ai")
      
      const mockResponse = {
        title: "3-Day Mediterranean Vegetarian Plan",
        meals: [
          {
            day: 1,
            type: "breakfast" as const,
            name: "Greek Yogurt Bowl",
            description: "Creamy Greek yogurt with honey and nuts",
            ingredients: ["200g Greek yogurt", "30ml honey", "50g walnuts", "100g berries"],
            estimatedCalories: 350,
            prepTime: 5,
          },
          {
            day: 1,
            type: "lunch" as const,
            name: "Mediterranean Salad",
            description: "Fresh salad with olive oil dressing",
            ingredients: ["100g mixed greens", "200g tomatoes", "50g feta cheese", "30ml olive oil"],
            estimatedCalories: 400,
            prepTime: 10,
          },
          {
            day: 1,
            type: "dinner" as const,
            name: "Vegetarian Pasta",
            description: "Whole wheat pasta with vegetables",
            ingredients: ["200g pasta", "300g mixed vegetables", "50g parmesan", "30ml olive oil"],
            estimatedCalories: 500,
            prepTime: 25,
          }
        ],
        shoppingList: [
          {
            name: "Dairy & Eggs",
            icon: "🥛",
            items: ["200g Greek yogurt", "50g feta cheese", "50g parmesan"]
          }
        ],
      }

      vi.mocked(generateText).mockResolvedValueOnce({
        text: JSON.stringify(mockResponse),
      })

      const { generateMealPlan } = await import("@/lib/meal-generation")
      const result = await generateMealPlan(mockUserProfile, "test-user-123")
      
      expect(result).toHaveProperty("id")
      expect(result).toHaveProperty("userId", "test-user-123")
      expect(result).toHaveProperty("title", "3-Day Mediterranean Vegetarian Plan")
      expect(result).toHaveProperty("duration", 3)
      expect(result).toHaveProperty("meals")
      expect(result).toHaveProperty("createdAt")
      expect(result).toHaveProperty("updatedAt")
      expect(result).toHaveProperty("shoppingList")
      expect(Array.isArray(result.meals)).toBe(true)
      expect(result.meals).toHaveLength(3)
    })

    it("should handle API errors gracefully", async () => {
      // Mock the generateText function to throw an error
      const { generateText } = await import("ai")
      vi.mocked(generateText).mockRejectedValueOnce(new Error("API Error"))

      const { generateMealPlan } = await import("@/lib/meal-generation")

      await expect(generateMealPlan(mockUserProfile, "test-user-123"))
        .rejects
        .toThrow("Failed to generate meal plan. Please try again.")
    })
  })

  describe("regenerateMeal", () => {
    it("should regenerate a single meal", async () => {
      const mockMeal = {
        id: "meal-1",
        day: 1,
        type: "breakfast" as const,
        name: "Original Meal",
        description: "Original description",
        ingredients: ["ingredient1", "ingredient2"],
        estimatedCalories: 300,
        prepTime: 15,
      }

      // Mock the generateText function
      const { generateText } = await import("ai")
      vi.mocked(generateText).mockResolvedValueOnce({
        text: JSON.stringify({
          name: "New Breakfast Bowl",
          description: "A fresh breakfast option",
          ingredients: ["100g oats", "150g mixed fruits", "30g nuts"],
          estimatedCalories: 320,
          prepTime: 10,
        }),
      })

      const { regenerateMeal } = await import("@/lib/meal-generation")
      const result = await regenerateMeal(mockMeal, mockUserProfile)
      
      expect(result).toHaveProperty("id")
      expect(result.id).toBe(mockMeal.id) // Should keep the same ID
      expect(result.day).toBe(mockMeal.day)
      expect(result.type).toBe(mockMeal.type)
      expect(result.name).toBe("New Breakfast Bowl")
      expect(result.description).toBe("A fresh breakfast option")
      expect(result.estimatedCalories).toBe(320)
      expect(result.prepTime).toBe(10)
    })
  })
})

describe("API Client", () => {
  describe("mealPlanAPI", () => {
    it("should have correct API methods", async () => {
      const { mealPlanAPI } = await import("@/lib/api-client")
      
      expect(typeof mealPlanAPI.generateMealPlan).toBe("function")
      expect(typeof mealPlanAPI.regenerateMeal).toBe("function")
    })
  })
})

// Integration test placeholder (requires actual environment setup)
describe.skip("Integration Tests", () => {
  it("should generate meal plan via API endpoint", async () => {
    // This test would require actual Azure OpenAI credentials
    // and should be run in a separate test environment
  })
})