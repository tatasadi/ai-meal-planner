export interface UserProfile {
  id: string
  email: string
  age: number
  gender: "male" | "female" | "other"
  height: number // cm
  weight: number // kg
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active"
  dietaryRestrictions: string[]
  allergies: string[]
  goals: "weight_loss" | "maintenance" | "weight_gain" | "muscle_gain"
  preferences: {
    cuisineTypes: string[]
    dislikedFoods: string[]
    mealComplexity: "simple" | "moderate" | "complex"
  }
}

export interface ShoppingCategory {
  name: string
  icon: string
  items: string[]
}

export interface MealPlan {
  id: string
  userId: string
  title: string
  duration: number // days
  meals: Meal[]
  shoppingList: ShoppingCategory[] // AI-generated categorized shopping list
  groceryListId?: string // Reference to the interactive grocery list
  createdAt: Date
  updatedAt: Date
}

export interface Meal {
  id: string
  day: number
  type: "breakfast" | "lunch" | "dinner"
  name: string
  description: string
  ingredients: string[]
  estimatedCalories: number
  prepTime: number // minutes
}

export interface ChatMessage {
  id: string
  userId: string
  mealPlanId: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  metadata?: {
    actionTaken?: string // 'regenerate_meal', 'modify_plan', etc.
    affectedMeals?: string[]
  }
}

export interface GroceryList {
  id: string
  userId: string
  mealPlanId: string
  items: GroceryItem[]
  createdAt: Date
  updatedAt: Date
}

export interface GroceryItem {
  id: string
  name: string
  quantity: string
  category: "produce" | "protein" | "dairy" | "pantry" | "spices" | "other"
  checked: boolean
}
