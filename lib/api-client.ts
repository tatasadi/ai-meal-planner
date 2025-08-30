import type { UserProfile, MealPlan, Meal, ShoppingCategory } from "@/lib/types"

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message)
    this.name = "APIError"
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "An unknown error occurred",
    }))

    throw new APIError(
      error.error || `HTTP ${response.status}`,
      response.status,
      error.details
    )
  }

  return response.json()
}

export const mealPlanAPI = {
  async generateMealPlan(userProfile: UserProfile): Promise<MealPlan> {
    const response = await fetch("/api/meal-plan/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        duration: 3, // Fixed to 3 days for MVP
        userProfile,
      }),
    })

    return handleResponse<MealPlan>(response)
  },

  async regenerateMeal(
    meal: Meal,
    allMeals: Meal[],
    userProfile: UserProfile,
    context?: string
  ): Promise<{ meal: Meal; shoppingList: ShoppingCategory[] }> {
    const response = await fetch("/api/meal-plan/regenerate-meal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meal,
        allMeals,
        userProfile,
        context,
      }),
    })

    return handleResponse<{ meal: Meal; shoppingList: string[] }>(response)
  },
}

// Utility function to check if error is rate limit
export function isRateLimitError(error: unknown): boolean {
  return error instanceof APIError && error.status === 429
}

// Utility function to check if error is validation error
export function isValidationError(error: unknown): boolean {
  return error instanceof APIError && error.status === 400
}

// Generic API client for other endpoints
export const apiClient = {
  async post<T>(url: string, data: any): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    return handleResponse<T>(response)
  },

  async get<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    return handleResponse<T>(response)
  },
}
