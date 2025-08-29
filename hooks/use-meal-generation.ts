import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { useMealPlanStore } from "@/store"
import {
  mealPlanAPI,
  APIError,
  isRateLimitError,
  isValidationError,
} from "@/lib/api-client"
import type { UserProfile, Meal } from "@/lib/types"

export function useMealGeneration() {
  const router = useRouter()
  const {
    setCurrentMealPlan,
    setGeneratingMealPlan,
    setRegeneratingMeal,
    setError,
    updateMealAndShoppingList,
    userProfile,
    currentMealPlan,
  } = useMealPlanStore()

  const generateMealPlan = useCallback(
    async (profile: UserProfile) => {
      setError(null)
      setGeneratingMealPlan(true)

      try {
        const mealPlan = await mealPlanAPI.generateMealPlan(profile)
        setCurrentMealPlan(mealPlan)
        toast.success("Meal plan generated successfully!")
        router.push("/dashboard")
      } catch (error) {
        console.error("Meal plan generation failed:", error)

        let errorMessage = "Failed to generate meal plan. Please try again."

        if (error instanceof APIError) {
          if (isRateLimitError(error)) {
            errorMessage =
              "Too many requests. Please wait a moment and try again."
          } else if (isValidationError(error)) {
            errorMessage =
              "Invalid profile data. Please check your information."
          } else if (error.status === 503) {
            errorMessage =
              "Service temporarily unavailable. Please try again later."
          }
        }

        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setGeneratingMealPlan(false)
      }
    },
    [setCurrentMealPlan, setGeneratingMealPlan, setError, router]
  )

  const regenerateMeal = useCallback(
    async (meal: Meal, context?: string) => {
      if (!userProfile || !currentMealPlan) {
        toast.error("User profile or meal plan not found. Please try refreshing the page.")
        return
      }

      setError(null)
      setRegeneratingMeal(meal.id)

      try {
        const { meal: newMeal, shoppingList } = await mealPlanAPI.regenerateMeal(
          meal,
          currentMealPlan.meals,
          userProfile,
          context
        )
        updateMealAndShoppingList(newMeal, shoppingList)
        toast.success("Meal and shopping list updated successfully!")
      } catch (error) {
        console.error("Meal regeneration failed:", error)

        let errorMessage = "Failed to regenerate meal. Please try again."

        if (error instanceof APIError) {
          if (isRateLimitError(error)) {
            errorMessage =
              "Too many requests. Please wait a moment and try again."
          } else if (error.status === 503) {
            errorMessage =
              "Service temporarily unavailable. Please try again later."
          }
        }

        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setRegeneratingMeal(null)
      }
    },
    [userProfile, currentMealPlan, setError, setRegeneratingMeal, updateMealAndShoppingList]
  )

  const { isGeneratingMealPlan, regeneratingMealId, error } = useMealPlanStore()

  return {
    generateMealPlan,
    regenerateMeal,
    isGeneratingMealPlan,
    regeneratingMealId,
    error,
  }
}
