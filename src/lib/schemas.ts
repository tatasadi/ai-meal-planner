import { z } from "zod"

// Zod schemas for runtime validation from CLAUDE.md
export const UserProfileSchema = z.object({
  age: z.number().min(13).max(120),
  gender: z.enum(["male", "female", "other"]),
  height: z.number().min(100).max(250), // cm
  weight: z.number().min(30).max(300), // kg
  activityLevel: z.enum([
    "sedentary",
    "light",
    "moderate",
    "active",
    "very_active",
  ]),
  dietaryRestrictions: z.array(z.string()),
  allergies: z.array(z.string()),
  goals: z.enum(["weight_loss", "maintenance", "weight_gain", "muscle_gain"]),
  preferences: z.object({
    cuisineTypes: z.array(z.string()),
    dislikedFoods: z.array(z.string()),
    mealComplexity: z.enum(["simple", "moderate", "complex"]),
  }),
})

export const MealPlanRequestSchema = z.object({
  duration: z.number().min(3).max(3), // Fixed to 3 days for MVP
  userProfile: UserProfileSchema,
})