import { describe, it, expect } from 'vitest'
import { UserProfileSchema, MealPlanRequestSchema } from '@/lib/schemas'

describe('schemas', () => {
  describe('UserProfileSchema', () => {
    it('should validate a complete user profile', () => {
      const validProfile = {
        age: 25,
        gender: 'male' as const,
        height: 180,
        weight: 75,
        activityLevel: 'moderate' as const,
        dietaryRestrictions: ['vegetarian'],
        allergies: ['nuts'],
        goals: 'weight_loss' as const,
        preferences: {
          cuisineTypes: ['italian', 'mexican'],
          dislikedFoods: ['mushrooms'],
          mealComplexity: 'moderate' as const,
        },
      }

      const result = UserProfileSchema.safeParse(validProfile)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data).toEqual(validProfile)
      }
    })

    it('should reject invalid age ranges', () => {
      const tooYoung = { age: 10 }
      const tooOld = { age: 150 }

      expect(UserProfileSchema.safeParse(tooYoung).success).toBe(false)
      expect(UserProfileSchema.safeParse(tooOld).success).toBe(false)
    })

    it('should validate age boundaries', () => {
      const minAge = { age: 13, gender: 'male', height: 150, weight: 50, activityLevel: 'light', dietaryRestrictions: [], allergies: [], goals: 'maintenance', preferences: { cuisineTypes: [], dislikedFoods: [], mealComplexity: 'simple' } }
      const maxAge = { age: 120, gender: 'male', height: 150, weight: 50, activityLevel: 'light', dietaryRestrictions: [], allergies: [], goals: 'maintenance', preferences: { cuisineTypes: [], dislikedFoods: [], mealComplexity: 'simple' } }

      expect(UserProfileSchema.safeParse(minAge).success).toBe(true)
      expect(UserProfileSchema.safeParse(maxAge).success).toBe(true)
    })

    it('should reject invalid gender values', () => {
      const invalidGender = {
        age: 25,
        gender: 'invalid',
        height: 180,
        weight: 75,
        activityLevel: 'moderate',
        dietaryRestrictions: [],
        allergies: [],
        goals: 'maintenance',
        preferences: { cuisineTypes: [], dislikedFoods: [], mealComplexity: 'moderate' }
      }

      expect(UserProfileSchema.safeParse(invalidGender).success).toBe(false)
    })

    it('should validate height ranges', () => {
      const tooShort = { height: 50 }
      const tooTall = { height: 300 }
      const validHeight = { height: 175 }

      expect(UserProfileSchema.safeParse({ ...validHeight, age: 25, gender: 'male', weight: 75, activityLevel: 'moderate', dietaryRestrictions: [], allergies: [], goals: 'maintenance', preferences: { cuisineTypes: [], dislikedFoods: [], mealComplexity: 'moderate' } }).success).toBe(true)
      expect(UserProfileSchema.safeParse(tooShort).success).toBe(false)
      expect(UserProfileSchema.safeParse(tooTall).success).toBe(false)
    })

    it('should validate weight ranges', () => {
      const tooLight = { weight: 20 }
      const tooHeavy = { weight: 400 }
      const validWeight = { weight: 70 }

      expect(UserProfileSchema.safeParse({ ...validWeight, age: 25, gender: 'male', height: 180, activityLevel: 'moderate', dietaryRestrictions: [], allergies: [], goals: 'maintenance', preferences: { cuisineTypes: [], dislikedFoods: [], mealComplexity: 'moderate' } }).success).toBe(true)
      expect(UserProfileSchema.safeParse(tooLight).success).toBe(false)
      expect(UserProfileSchema.safeParse(tooHeavy).success).toBe(false)
    })

    it('should validate activity level enum', () => {
      const validActivityLevels = ['sedentary', 'light', 'moderate', 'active', 'very_active']
      const baseProfile = { age: 25, gender: 'male', height: 180, weight: 75, dietaryRestrictions: [], allergies: [], goals: 'maintenance', preferences: { cuisineTypes: [], dislikedFoods: [], mealComplexity: 'moderate' } }

      validActivityLevels.forEach(level => {
        const profile = { ...baseProfile, activityLevel: level }
        expect(UserProfileSchema.safeParse(profile).success).toBe(true)
      })

      const invalidProfile = { ...baseProfile, activityLevel: 'super_active' }
      expect(UserProfileSchema.safeParse(invalidProfile).success).toBe(false)
    })

    it('should validate goals enum', () => {
      const validGoals = ['weight_loss', 'maintenance', 'weight_gain', 'muscle_gain']
      const baseProfile = { age: 25, gender: 'male', height: 180, weight: 75, activityLevel: 'moderate', dietaryRestrictions: [], allergies: [], preferences: { cuisineTypes: [], dislikedFoods: [], mealComplexity: 'moderate' } }

      validGoals.forEach(goal => {
        const profile = { ...baseProfile, goals: goal }
        expect(UserProfileSchema.safeParse(profile).success).toBe(true)
      })

      const invalidProfile = { ...baseProfile, goals: 'get_shredded' }
      expect(UserProfileSchema.safeParse(invalidProfile).success).toBe(false)
    })

    it('should validate meal complexity enum', () => {
      const validComplexities = ['simple', 'moderate', 'complex']
      const baseProfile = { age: 25, gender: 'male', height: 180, weight: 75, activityLevel: 'moderate', dietaryRestrictions: [], allergies: [], goals: 'maintenance' }

      validComplexities.forEach(complexity => {
        const profile = { 
          ...baseProfile, 
          preferences: { 
            cuisineTypes: [], 
            dislikedFoods: [], 
            mealComplexity: complexity 
          } 
        }
        expect(UserProfileSchema.safeParse(profile).success).toBe(true)
      })
    })

    it('should accept empty arrays for optional fields', () => {
      const profileWithEmptyArrays = {
        age: 25,
        gender: 'female' as const,
        height: 165,
        weight: 60,
        activityLevel: 'light' as const,
        dietaryRestrictions: [],
        allergies: [],
        goals: 'maintenance' as const,
        preferences: {
          cuisineTypes: [],
          dislikedFoods: [],
          mealComplexity: 'simple' as const,
        },
      }

      const result = UserProfileSchema.safeParse(profileWithEmptyArrays)
      expect(result.success).toBe(true)
    })

    it('should handle missing required fields', () => {
      const incompleteProfile = {
        age: 25,
        gender: 'male',
        // missing height, weight, etc.
      }

      expect(UserProfileSchema.safeParse(incompleteProfile).success).toBe(false)
    })

    it('should validate array fields contain strings', () => {
      const invalidDietaryRestrictions = {
        age: 25,
        gender: 'male' as const,
        height: 180,
        weight: 75,
        activityLevel: 'moderate' as const,
        dietaryRestrictions: [123, 'vegetarian'], // number instead of string
        allergies: [],
        goals: 'maintenance' as const,
        preferences: {
          cuisineTypes: [],
          dislikedFoods: [],
          mealComplexity: 'moderate' as const,
        },
      }

      expect(UserProfileSchema.safeParse(invalidDietaryRestrictions).success).toBe(false)
    })
  })

  describe('MealPlanRequestSchema', () => {
    it('should validate a complete meal plan request', () => {
      const validRequest = {
        duration: 3,
        userProfile: {
          age: 30,
          gender: 'female' as const,
          height: 170,
          weight: 65,
          activityLevel: 'active' as const,
          dietaryRestrictions: ['gluten-free'],
          allergies: [],
          goals: 'muscle_gain' as const,
          preferences: {
            cuisineTypes: ['asian'],
            dislikedFoods: ['cilantro'],
            mealComplexity: 'complex' as const,
          },
        },
      }

      const result = MealPlanRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.duration).toBe(3)
        expect(result.data.userProfile.age).toBe(30)
      }
    })

    it('should enforce duration to be exactly 3 days', () => {
      const baseRequest = {
        userProfile: {
          age: 25,
          gender: 'male' as const,
          height: 180,
          weight: 75,
          activityLevel: 'moderate' as const,
          dietaryRestrictions: [],
          allergies: [],
          goals: 'maintenance' as const,
          preferences: {
            cuisineTypes: [],
            dislikedFoods: [],
            mealComplexity: 'moderate' as const,
          },
        },
      }

      // Should accept 3
      expect(MealPlanRequestSchema.safeParse({ ...baseRequest, duration: 3 }).success).toBe(true)
      
      // Should reject other values
      expect(MealPlanRequestSchema.safeParse({ ...baseRequest, duration: 1 }).success).toBe(false)
      expect(MealPlanRequestSchema.safeParse({ ...baseRequest, duration: 7 }).success).toBe(false)
      expect(MealPlanRequestSchema.safeParse({ ...baseRequest, duration: 10 }).success).toBe(false)
    })

    it('should require valid user profile', () => {
      const invalidRequest = {
        duration: 3,
        userProfile: {
          age: 5, // too young
          gender: 'male',
          height: 180,
          weight: 75,
          activityLevel: 'moderate',
          dietaryRestrictions: [],
          allergies: [],
          goals: 'maintenance',
          preferences: {
            cuisineTypes: [],
            dislikedFoods: [],
            mealComplexity: 'moderate',
          },
        },
      }

      expect(MealPlanRequestSchema.safeParse(invalidRequest).success).toBe(false)
    })

    it('should reject missing required fields', () => {
      const missingDuration = {
        userProfile: {
          age: 25,
          gender: 'male' as const,
          height: 180,
          weight: 75,
          activityLevel: 'moderate' as const,
          dietaryRestrictions: [],
          allergies: [],
          goals: 'maintenance' as const,
          preferences: {
            cuisineTypes: [],
            dislikedFoods: [],
            mealComplexity: 'moderate' as const,
          },
        },
      }

      const missingUserProfile = {
        duration: 3,
      }

      expect(MealPlanRequestSchema.safeParse(missingDuration).success).toBe(false)
      expect(MealPlanRequestSchema.safeParse(missingUserProfile).success).toBe(false)
    })
  })
})