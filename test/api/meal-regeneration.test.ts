import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST } from '@/app/api/meal-plan/regenerate-meal/route'
import { NextRequest } from 'next/server'

// Create mock functions that we can control
const mockRegenerateMeal = vi.hoisted(() => vi.fn())
const mockRegenerateShoppingList = vi.hoisted(() => vi.fn())

// Mock the meal generation library
vi.mock('@/lib/meal-generation', () => ({
  regenerateMeal: mockRegenerateMeal,
  regenerateShoppingList: mockRegenerateShoppingList,
}))

// Mock sanitization
vi.mock('@/lib/sanitization', () => ({
  sanitizeUserProfile: vi.fn((profile) => profile),
}))

describe('/api/meal-plan/regenerate-meal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRegenerateMeal.mockClear()
    mockRegenerateShoppingList.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (body: any): NextRequest => {
    return new NextRequest('http://localhost:3000/api/meal-plan/regenerate-meal', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  const validMeal = {
    id: 'meal-1',
    day: 1,
    type: 'breakfast' as const,
    name: 'Old Breakfast',
    description: 'Original breakfast',
    ingredients: ['old ingredient 1', 'old ingredient 2'],
    estimatedCalories: 300,
    prepTime: 10,
  }

  const validUserProfile = {
    age: 30,
    gender: 'male' as const,
    height: 180,
    weight: 75,
    activityLevel: 'moderate' as const,
    dietaryRestrictions: ['vegetarian'],
    allergies: [],
    goals: 'weight_loss' as const,
    preferences: {
      cuisineTypes: ['italian'],
      dislikedFoods: ['mushrooms'],
      mealComplexity: 'moderate' as const,
    },
  }

  const allMeals = [
    validMeal,
    {
      id: 'meal-2',
      day: 1,
      type: 'lunch' as const,
      name: 'Lunch',
      description: 'Lunch meal',
      ingredients: ['lunch ingredient'],
      estimatedCalories: 400,
      prepTime: 20,
    },
  ]

  const regeneratedMeal = {
    ...validMeal,
    name: 'New Breakfast',
    description: 'Regenerated breakfast',
    ingredients: ['new ingredient 1', 'new ingredient 2'],
  }

  const regeneratedShoppingList = [
    {
      name: 'Pantry',
      icon: '🥫',
      items: ['new ingredient 1', 'new ingredient 2', 'lunch ingredient'],
    },
  ]

  describe('Successful requests', () => {
    it('should regenerate meal and shopping list', async () => {
      mockRegenerateMeal.mockResolvedValue(regeneratedMeal)
      mockRegenerateShoppingList.mockResolvedValue(regeneratedShoppingList)

      const request = createMockRequest({
        meal: validMeal,
        allMeals: allMeals,
        userProfile: validUserProfile,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.meal.name).toBe('New Breakfast')
      expect(data.meal.ingredients).toEqual(['new ingredient 1', 'new ingredient 2'])
      expect(data.shoppingList).toEqual(regeneratedShoppingList)

      expect(mockRegenerateMeal).toHaveBeenCalledTimes(1)
      expect(mockRegenerateShoppingList).toHaveBeenCalledTimes(1)
    })

    it('should pass context to meal regeneration', async () => {
      mockRegenerateMeal.mockResolvedValue(regeneratedMeal)
      mockRegenerateShoppingList.mockResolvedValue(regeneratedShoppingList)

      const context = 'Make it lighter'

      const request = createMockRequest({
        meal: validMeal,
        allMeals: allMeals,
        userProfile: validUserProfile,
        context: context,
      })

      await POST(request)

      expect(mockRegenerateMeal).toHaveBeenCalledWith(
        validMeal,
        expect.objectContaining(validUserProfile),
        context
      )
    })

    it('should sanitize user profile before processing', async () => {
      mockRegenerateMeal.mockResolvedValue(regeneratedMeal)
      mockRegenerateShoppingList.mockResolvedValue(regeneratedShoppingList)
      const { sanitizeUserProfile } = await import('@/lib/sanitization')

      const request = createMockRequest({
        meal: validMeal,
        allMeals: allMeals,
        userProfile: validUserProfile,
      })

      await POST(request)

      expect(vi.mocked(sanitizeUserProfile)).toHaveBeenCalledTimes(1)
    })

    it('should regenerate shopping list with updated meals', async () => {
      mockRegenerateMeal.mockResolvedValue(regeneratedMeal)
      mockRegenerateShoppingList.mockResolvedValue(regeneratedShoppingList)

      const request = createMockRequest({
        meal: validMeal,
        allMeals: allMeals,
        userProfile: validUserProfile,
      })

      await POST(request)

      const expectedUpdatedMeals = allMeals.map(m => 
        m.id === validMeal.id ? regeneratedMeal : m
      )

      expect(mockRegenerateShoppingList).toHaveBeenCalledWith(
        expectedUpdatedMeals,
        expect.objectContaining(validUserProfile)
      )
    })
  })

  describe('Validation errors', () => {
    it('should reject invalid meal data', async () => {
      const invalidMeal = {
        id: 'meal-1',
        day: 'invalid', // should be number
        type: 'breakfast',
        name: 'Breakfast',
        description: 'Description',
        ingredients: [],
        estimatedCalories: 300,
        prepTime: 10,
      }

      const request = createMockRequest({
        meal: invalidMeal,
        allMeals: allMeals,
        userProfile: validUserProfile,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(data.details).toBeDefined()
      expect(mockRegenerateMeal).not.toHaveBeenCalled()
    })

    it('should reject invalid user profile', async () => {
      const invalidProfile = {
        ...validUserProfile,
        age: 5, // too young
      }

      const request = createMockRequest({
        meal: validMeal,
        allMeals: allMeals,
        userProfile: invalidProfile,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request data')
      expect(mockRegenerateMeal).not.toHaveBeenCalled()
    })

    it('should reject missing required fields', async () => {
      const testCases = [
        {
          description: 'missing meal',
          body: { allMeals, userProfile: validUserProfile },
        },
        {
          description: 'missing allMeals',
          body: { meal: validMeal, userProfile: validUserProfile },
        },
        {
          description: 'missing userProfile',
          body: { meal: validMeal, allMeals },
        },
      ]

      for (const testCase of testCases) {
        const request = createMockRequest(testCase.body)
        const response = await POST(request)

        expect(response.status).toBe(400)
        expect(mockRegenerateMeal).not.toHaveBeenCalled()
      }
    })

    it('should validate meal type enum', async () => {
      const invalidMealTypes = ['brunch', 'snack', 'dessert']

      for (const invalidType of invalidMealTypes) {
        const invalidMeal = {
          ...validMeal,
          type: invalidType,
        }

        const request = createMockRequest({
          meal: invalidMeal,
          allMeals: allMeals,
          userProfile: validUserProfile,
        })

        const response = await POST(request)
        expect(response.status).toBe(400)
      }
    })

    it('should validate ingredients array', async () => {
      const invalidMeal = {
        ...validMeal,
        ingredients: 'not an array', // should be array
      }

      const request = createMockRequest({
        meal: invalidMeal,
        allMeals: allMeals,
        userProfile: validUserProfile,
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('Server errors', () => {
    it('should handle meal regeneration errors', async () => {
      mockRegenerateMeal.mockRejectedValue(new Error('AI service unavailable'))

      const request = createMockRequest({
        meal: validMeal,
        allMeals: allMeals,
        userProfile: validUserProfile,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to regenerate meal. Please try again.')
    })

    it('should handle shopping list regeneration errors', async () => {
      mockRegenerateMeal.mockResolvedValue(regeneratedMeal)
      mockRegenerateShoppingList.mockRejectedValue(new Error('Shopping list generation failed'))

      const request = createMockRequest({
        meal: validMeal,
        allMeals: allMeals,
        userProfile: validUserProfile,
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
    })

    it('should handle network errors', async () => {
      mockRegenerateMeal.mockRejectedValue(new Error('Network error'))

      const request = createMockRequest({
        meal: validMeal,
        allMeals: allMeals,
        userProfile: validUserProfile,
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
    })

    it('should handle timeout errors', async () => {
      // Mock a timeout error
      mockRegenerateMeal.mockRejectedValue(new Error('Request timeout'))

      const request = createMockRequest({
        meal: validMeal,
        allMeals: allMeals,
        userProfile: validUserProfile,
      })

      const response = await POST(request)
      expect(response.status).toBe(500)
    })
  })

  describe('Edge cases', () => {
    it('should handle empty allMeals array', async () => {
      mockRegenerateMeal.mockResolvedValue(regeneratedMeal)
      mockRegenerateShoppingList.mockResolvedValue([])

      const request = createMockRequest({
        meal: validMeal,
        allMeals: [],
        userProfile: validUserProfile,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.shoppingList).toEqual([])
    })

    it('should handle meal not found in allMeals', async () => {
      mockRegenerateMeal.mockResolvedValue(regeneratedMeal)
      mockRegenerateShoppingList.mockResolvedValue(regeneratedShoppingList)

      const differentMeal = {
        ...validMeal,
        id: 'different-meal-id',
      }

      const request = createMockRequest({
        meal: differentMeal,
        allMeals: allMeals, // doesn't contain differentMeal
        userProfile: validUserProfile,
      })

      const response = await POST(request)
      
      // Should still work - the meal gets regenerated and added to the list
      expect(response.status).toBe(200)
    })

    it('should handle large allMeals arrays', async () => {
      mockRegenerateMeal.mockResolvedValue(regeneratedMeal)
      mockRegenerateShoppingList.mockResolvedValue(regeneratedShoppingList)

      const largeMealsArray = Array.from({ length: 50 }, (_, i) => ({
        ...validMeal,
        id: `meal-${i}`,
        name: `Meal ${i}`,
      }))

      const request = createMockRequest({
        meal: validMeal,
        allMeals: largeMealsArray,
        userProfile: validUserProfile,
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })
  })

  describe('OPTIONS method', () => {
    it('should handle CORS preflight requests', async () => {
      const { OPTIONS } = await import('@/app/api/meal-plan/regenerate-meal/route')
      const response = await OPTIONS()

      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
    })
  })

  describe('Context handling', () => {
    it('should handle optional context parameter', async () => {
      mockRegenerateMeal.mockResolvedValue(regeneratedMeal)
      mockRegenerateShoppingList.mockResolvedValue(regeneratedShoppingList)

      // Without context
      const requestWithoutContext = createMockRequest({
        meal: validMeal,
        allMeals: allMeals,
        userProfile: validUserProfile,
      })

      const response1 = await POST(requestWithoutContext)
      expect(response1.status).toBe(200)
      expect(mockRegenerateMeal).toHaveBeenCalledWith(
        validMeal,
        expect.any(Object),
        undefined
      )

      vi.clearAllMocks()

      // With context
      const requestWithContext = createMockRequest({
        meal: validMeal,
        allMeals: allMeals,
        userProfile: validUserProfile,
        context: 'Make it spicier',
      })

      const response2 = await POST(requestWithContext)
      expect(response2.status).toBe(200)
      expect(mockRegenerateMeal).toHaveBeenCalledWith(
        validMeal,
        expect.any(Object),
        'Make it spicier'
      )
    })
  })
})