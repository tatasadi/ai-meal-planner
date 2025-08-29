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
    updateMeal,
    userProfile,
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
      if (!userProfile) {
        toast.error("User profile not found. Please try refreshing the page.")
        return
      }

      setError(null)
      setRegeneratingMeal(meal.id)

      try {
        const newMeal = await mealPlanAPI.regenerateMeal(
          meal,
          userProfile,
          context
        )
        updateMeal(newMeal)
        toast.success("Meal regenerated successfully!")
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
    [userProfile, setError, setRegeneratingMeal, updateMeal]
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
