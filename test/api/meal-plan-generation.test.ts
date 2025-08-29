import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST } from '@/app/api/meal-plan/generate/route'
import { NextRequest } from 'next/server'

// Mock the meal generation library
vi.mock('@/lib/meal-generation', () => ({
  generateMealPlan: vi.fn(),
}))

// Mock sanitization
vi.mock('@/lib/sanitization', () => ({
  sanitizeUserProfile: vi.fn((profile) => profile),
}))

describe('/api/meal-plan/generate', () => {
  const mockGenerateMealPlan = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    const mealGeneration = await import('@/lib/meal-generation')
    vi.mocked(mealGeneration.generateMealPlan).mockImplementation(mockGenerateMealPlan)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (body: any): NextRequest => {
    return new NextRequest('http://localhost:3000/api/meal-plan/generate', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    })
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

  const validMealPlan = {
    id: 'plan-123',
    userId: 'user-123',
    title: 'Your 3-Day Meal Plan',
    duration: 3,
    meals: [
      {
        id: 'meal-1',
        day: 1,
        type: 'breakfast' as const,
        name: 'Oatmeal with Berries',
        description: 'Healthy breakfast',
        ingredients: ['1 cup oats', '1/2 cup berries'],
        estimatedCalories: 300,
        prepTime: 10,
      },
    ],
    shoppingList: [
      {
        name: 'Pantry',
        icon: '🥫',
        items: ['1 cup oats'],
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  describe('Successful requests', () => {
    it('should generate meal plan for valid request', async () => {
      mockGenerateMealPlan.mockResolvedValue(validMealPlan)

      const request = createMockRequest({
        userProfile: validUserProfile,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('plan-123')
      expect(data.title).toBe('Your 3-Day Meal Plan')
      expect(data.meals).toHaveLength(1)
      expect(data.shoppingList).toHaveLength(1)
      expect(mockGenerateMealPlan).toHaveBeenCalledTimes(1)
    })

    it('should include rate limit headers in successful response', async () => {
      mockGenerateMealPlan.mockResolvedValue(validMealPlan)

      const request = createMockRequest({
        userProfile: validUserProfile,
      })

      const response = await POST(request)

      expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy()
      expect(response.headers.get('X-RateLimit-Limit')).toBeTruthy()
      expect(response.headers.get('X-Request-ID')).toBeTruthy()
    })

    it('should sanitize user profile before processing', async () => {
      mockGenerateMealPlan.mockResolvedValue(validMealPlan)
      const { sanitizeUserProfile } = await import('@/lib/sanitization')

      const request = createMockRequest({
        userProfile: validUserProfile,
      })

      await POST(request)

      expect(vi.mocked(sanitizeUserProfile)).toHaveBeenCalledTimes(1)
      expect(mockGenerateMealPlan).toHaveBeenCalledWith(
        expect.objectContaining(validUserProfile),
        expect.any(String)
      )
    })
  })

  describe('Validation errors', () => {
    it('should reject invalid user profile', async () => {
      const invalidProfile = {
        age: 5, // too young
        gender: 'male',
        height: 180,
        weight: 75,
        activityLevel: 'moderate',
        dietaryRestrictions: [],
        allergies: [],
        goals: 'weight_loss',
        preferences: {
          cuisineTypes: [],
          dislikedFoods: [],
          mealComplexity: 'moderate',
        },
      }

      const request = createMockRequest({
        userProfile: invalidProfile,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Please check your input and try again.')
      expect(data.details).toBeDefined()
      expect(mockGenerateMealPlan).not.toHaveBeenCalled()
    })

    it('should reject missing userProfile', async () => {
      const request = createMockRequest({
        // missing userProfile
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Please check your input and try again.')
      expect(mockGenerateMealPlan).not.toHaveBeenCalled()
    })

    it('should reject invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/meal-plan/generate', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should validate specific profile fields', async () => {
      const testCases = [
        {
          field: 'age',
          value: 150,
          description: 'age too high',
        },
        {
          field: 'height',
          value: 50,
          description: 'height too low',
        },
        {
          field: 'weight',
          value: 400,
          description: 'weight too high',
        },
        {
          field: 'gender',
          value: 'invalid',
          description: 'invalid gender',
        },
        {
          field: 'activityLevel',
          value: 'invalid',
          description: 'invalid activity level',
        },
        {
          field: 'goals',
          value: 'invalid',
          description: 'invalid goals',
        },
      ]

      for (const testCase of testCases) {
        const invalidProfile = {
          ...validUserProfile,
          [testCase.field]: testCase.value,
        }

        const request = createMockRequest({
          userProfile: invalidProfile,
        })

        const response = await POST(request)
        
        expect(response.status).toBe(400)
        expect(mockGenerateMealPlan).not.toHaveBeenCalled()
      }
    })
  })

  describe('Rate limiting', () => {
    it('should enforce rate limits', async () => {
      mockGenerateMealPlan.mockResolvedValue(validMealPlan)

      const request = createMockRequest({
        userProfile: validUserProfile,
      })

      // Make multiple requests quickly
      const requests = Array(65).fill(null).map(() => POST(request))
      const responses = await Promise.all(requests)

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)

      const rateLimitedData = await rateLimitedResponses[0].json()
      expect(rateLimitedData.error).toBe('Too many requests. Please wait a moment and try again.')
    })
  })

  describe('Server errors', () => {
    it('should handle meal generation errors', async () => {
      mockGenerateMealPlan.mockRejectedValue(new Error('AI service unavailable'))

      const request = createMockRequest({
        userProfile: validUserProfile,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeTruthy()
      expect(data.requestId).toBeTruthy()
    })

    it('should handle quota/rate limit errors from AI service', async () => {
      mockGenerateMealPlan.mockRejectedValue(new Error('quota exceeded'))

      const request = createMockRequest({
        userProfile: validUserProfile,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeTruthy()
    })

    it('should handle network errors', async () => {
      mockGenerateMealPlan.mockRejectedValue(new Error('fetch failed'))

      const request = createMockRequest({
        userProfile: validUserProfile,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeTruthy()
    })

    it('should include debug information in development', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      mockGenerateMealPlan.mockRejectedValue(new Error('Test error'))

      const request = createMockRequest({
        userProfile: validUserProfile,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.details).toBeTruthy()
      expect(data.type).toBeTruthy()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('OPTIONS method', () => {
    it('should handle CORS preflight requests', async () => {
      const { OPTIONS } = await import('@/app/api/meal-plan/generate/route')
      const response = await OPTIONS()

      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
    })
  })

  describe('Performance and logging', () => {
    it('should log performance metrics', async () => {
      mockGenerateMealPlan.mockResolvedValue(validMealPlan)
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const request = createMockRequest({
        userProfile: validUserProfile,
      })

      await POST(request)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Meal plan generation started')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Meal plan generated successfully')
      )

      consoleSpy.mockRestore()
    })

    it('should include request context in logs', async () => {
      mockGenerateMealPlan.mockRejectedValue(new Error('Test error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const request = createMockRequest({
        userProfile: validUserProfile,
      })

      await POST(request)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('meal-plan-generation')
      )

      consoleSpy.mockRestore()
    })
  })
})