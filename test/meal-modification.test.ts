import { describe, it, expect, vi, beforeEach } from "vitest"
import { modifyMeal, regenerateMeal, regenerateShoppingList } from "@/lib/meal-generation"
import type { UserProfile, Meal } from "@/lib/types"

// Mock the AI SDK
vi.mock("ai", () => ({
  generateText: vi.fn(),
}))

// Mock Azure OpenAI
vi.mock("@/lib/azure-openai", () => ({
  model: "mocked-model",
}))

describe("Meal Modification Functions", () => {
  const mockUserProfile: UserProfile = {
    id: "test-user",
    email: "test@example.com",
    age: 30,
    gender: "male",
    height: 180,
    weight: 75,
    activityLevel: "moderate",
    dietaryRestrictions: ["vegetarian"],
    allergies: ["nuts"],
    goals: "weight_loss",
    preferences: {
      cuisineTypes: ["mediterranean"],
      dislikedFoods: ["brussels sprouts"],
      mealComplexity: "moderate",
    },
  }

  const mockMeal: Meal = {
    id: "meal-1",
    day: 1,
    type: "breakfast",
    name: "Scrambled Eggs with Toast",
    description: "Classic breakfast with eggs and toast",
    ingredients: ["2 eggs", "2 slices bread", "10g butter", "salt", "pepper"],
    estimatedCalories: 400,
    prepTime: 15,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("modifyMeal", () => {
    it("should modify meal with AI chat response calorie target", async () => {
      const { generateText } = await import("ai")
      
      const mockAIResponse = JSON.stringify({
        name: "Light Scrambled Eggs with Toast",
        description: "Lighter version with reduced butter",
        ingredients: ["2 eggs", "2 slices bread", "5g butter", "salt", "pepper"],
        estimatedCalories: 320,
        prepTime: 15,
      })

      ;(generateText as any).mockResolvedValue({ text: mockAIResponse })

      const aiChatResponse = "I'll make this lighter by reducing butter and targeting 320 calories"
      const result = await modifyMeal(
        mockMeal,
        mockUserProfile,
        "make it lighter",
        aiChatResponse
      )

      expect(result.name).toBe("Light Scrambled Eggs with Toast")
      expect(result.estimatedCalories).toBe(320)
      expect(result.ingredients).toContain("5g butter")
      expect(generateText).toHaveBeenCalledWith({
        model: "mocked-model",
        prompt: expect.stringContaining("320 calories"), // Should use extracted calorie target
        temperature: 0.8,
      })
    })

    it("should use calculated calories when no specific target in chat response", async () => {
      const { generateText } = await import("ai")
      
      const mockAIResponse = JSON.stringify({
        name: "Modified Scrambled Eggs",
        description: "Modified version",
        ingredients: ["2 eggs", "1 slice bread"],
        estimatedCalories: 300,
        prepTime: 12,
      })

      ;(generateText as any).mockResolvedValue({ text: mockAIResponse })

      const result = await modifyMeal(
        mockMeal,
        mockUserProfile,
        "make it different"
      )

      // Should use calculated calories (weight loss = BMR * 1.55 - 500, then /3)
      const expectedCalories = Math.round(((10 * 75 + 6.25 * 180 - 5 * 30 + 5) * 1.55 - 500) / 3)
      
      expect(generateText).toHaveBeenCalledWith({
        model: "mocked-model",
        prompt: expect.stringContaining(`~${expectedCalories} calories`),
        temperature: 0.8,
      })
    })

    it("should include AI chat response in modification prompt", async () => {
      const { generateText } = await import("ai")
      
      ;(generateText as any).mockResolvedValue({
        text: JSON.stringify({
          name: "Modified Meal",
          description: "Modified",
          ingredients: ["ingredient"],
          estimatedCalories: 300,
          prepTime: 10,
        }),
      })

      const aiChatResponse = "I'll omit the butter and reduce bread to 1 slice"
      await modifyMeal(mockMeal, mockUserProfile, "make it lighter", aiChatResponse)

      const prompt = (generateText as any).mock.calls[0][0].prompt
      expect(prompt).toContain("AI Assistant's Specific Instructions:")
      expect(prompt).toContain("I'll omit the butter and reduce bread to 1 slice")
      expect(prompt).toContain("CRITICAL: Follow these exact instructions")
    })

    it("should handle AI parsing errors", async () => {
      const { generateText } = await import("ai")
      ;(generateText as any).mockResolvedValue({ text: "invalid json response" })

      await expect(
        modifyMeal(mockMeal, mockUserProfile, "make it lighter")
      ).rejects.toThrow("Failed to modify meal")
    })

    it("should include user dietary restrictions in prompt", async () => {
      const { generateText } = await import("ai")
      
      ;(generateText as any).mockResolvedValue({
        text: JSON.stringify({
          name: "Vegetarian Scrambled Eggs",
          description: "Vegetarian version",
          ingredients: ["2 eggs", "bread"],
          estimatedCalories: 350,
          prepTime: 15,
        }),
      })

      await modifyMeal(mockMeal, mockUserProfile, "make it healthier")

      const prompt = (generateText as any).mock.calls[0][0].prompt
      expect(prompt).toContain("Dietary restrictions: vegetarian")
      expect(prompt).toContain("Allergies: nuts")
      expect(prompt).toContain("Foods to avoid: brussels sprouts")
    })
  })

  describe("regenerateMeal", () => {
    it("should regenerate meal with context", async () => {
      const { generateText } = await import("ai")
      
      const mockAIResponse = JSON.stringify({
        name: "Greek Yogurt Parfait",
        description: "Fresh yogurt with berries",
        ingredients: ["200g greek yogurt", "50g berries", "30g granola"],
        estimatedCalories: 300,
        prepTime: 5,
      })

      ;(generateText as any).mockResolvedValue({ text: mockAIResponse })

      const result = await regenerateMeal(
        mockMeal,
        mockUserProfile,
        "User doesn't like eggs"
      )

      expect(result.name).toBe("Greek Yogurt Parfait")
      expect(result.id).toBe(mockMeal.id) // Should keep same ID
      expect(result.day).toBe(mockMeal.day) // Should keep same day
      expect(result.type).toBe(mockMeal.type) // Should keep same type
      
      const prompt = (generateText as any).mock.calls[0][0].prompt
      expect(prompt).toContain("Additional context: User doesn't like eggs")
      expect(prompt).toContain("different meal than \"Scrambled Eggs with Toast\"")
    })

    it("should handle regeneration without context", async () => {
      const { generateText } = await import("ai")
      
      ;(generateText as any).mockResolvedValue({
        text: JSON.stringify({
          name: "New Breakfast",
          description: "New meal",
          ingredients: ["ingredient"],
          estimatedCalories: 300,
          prepTime: 10,
        }),
      })

      await regenerateMeal(mockMeal, mockUserProfile)

      const prompt = (generateText as any).mock.calls[0][0].prompt
      expect(prompt).not.toContain("Additional context:")
      expect(prompt).toContain("Generate a replacement breakfast meal")
    })
  })

  describe("regenerateShoppingList", () => {
    const mockMeals: Meal[] = [
      {
        id: "meal-1",
        day: 1,
        type: "breakfast",
        name: "Eggs and Toast",
        description: "Breakfast",
        ingredients: ["2 eggs", "2 slices bread", "10g butter"],
        estimatedCalories: 400,
        prepTime: 15,
      },
      {
        id: "meal-2",
        day: 1,
        type: "lunch",
        name: "Chicken Salad",
        description: "Lunch",
        ingredients: ["100g chicken", "50g lettuce", "10g butter", "1 tomato"],
        estimatedCalories: 350,
        prepTime: 20,
      },
    ]

    it("should generate consolidated shopping list", async () => {
      const { generateText } = await import("ai")
      
      const mockAIResponse = JSON.stringify({
        shoppingList: [
          {
            name: "Produce",
            icon: "🥬",
            items: ["50g lettuce", "1 tomato"],
          },
          {
            name: "Dairy & Eggs",
            icon: "🥛",
            items: ["1 dozen eggs", "20g butter"],
          },
          {
            name: "Bakery",
            icon: "🍞", 
            items: ["1 loaf bread"],
          },
        ],
      })

      ;(generateText as any).mockResolvedValue({ text: mockAIResponse })

      const result = await regenerateShoppingList(mockMeals, mockUserProfile)

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe("Produce")
      expect(result[1].items).toContain("20g butter") // Should consolidate 10g + 10g
      
      const prompt = (generateText as any).mock.calls[0][0].prompt
      expect(prompt).toContain("CONSOLIDATE all duplicate ingredients")
      expect(prompt).toContain("10g butter") // Should appear twice in ingredient list
    })

    it("should include all ingredients in shopping list prompt", async () => {
      const { generateText } = await import("ai")
      
      ;(generateText as any).mockResolvedValue({
        text: JSON.stringify({ shoppingList: [] }),
      })

      await regenerateShoppingList(mockMeals, mockUserProfile)

      const prompt = (generateText as any).mock.calls[0][0].prompt
      expect(prompt).toContain("2 eggs")
      expect(prompt).toContain("100g chicken")
      expect(prompt).toContain("COMPLETE INGREDIENT LIST (6 total ingredients)") // eggs, bread, butter, chicken, lettuce, tomato - duplicates removed
    })

    it("should handle AI parsing errors", async () => {
      const { generateText } = await import("ai")
      ;(generateText as any).mockResolvedValue({ text: "invalid json" })

      await expect(
        regenerateShoppingList(mockMeals, mockUserProfile)
      ).rejects.toThrow("Failed to regenerate shopping list")
    })
  })
})