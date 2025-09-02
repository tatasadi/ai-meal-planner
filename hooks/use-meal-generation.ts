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
import { handleClientError, logger, monitorPerformance } from "@/lib/error-handling"
import { useAuth } from "./use-auth"
import type { UserProfile, Meal } from "@/lib/types"

export function useMealGeneration() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
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
      if (!isAuthenticated || !user) {
        const error = new Error("Authentication required")
        handleClientError(error, {
          operation: "meal-plan-generation",
          userId: profile.id,
          userProfile: {
            age: profile.age,
            goals: profile.goals,
            dietaryRestrictions: profile.dietaryRestrictions,
          }
        })
        return
      }

      const performance = monitorPerformance("client-meal-plan-generation")
      
      setError(null)
      setGeneratingMealPlan(true)

      try {
        logger.info("Starting meal plan generation", { 
          userId: user.id, 
          age: profile.age, 
          goals: profile.goals 
        })
        
        const authHeaders = {
          'x-user-id': user.id,
          'x-user-email': user.email,
          'x-user-name': user.name,
        }
        
        const mealPlan = await mealPlanAPI.generateMealPlan(profile, authHeaders)
        
        setCurrentMealPlan(mealPlan)
        
        const duration = performance.finish({ 
          userId: user.id, 
          mealPlanId: mealPlan.id,
          mealCount: mealPlan.meals.length
        })
        
        logger.info("Meal plan generation completed successfully", {
          userId: user.id,
          mealPlanId: mealPlan.id,
          duration: `${duration}ms`,
          mealCount: mealPlan.meals.length
        })
        
        toast.success("Meal plan generated successfully!")
        router.push("/dashboard")
      } catch (error) {
        performance.finish({ userId: user.id, error: true })
        
        const appError = handleClientError(error, {
          operation: "meal-plan-generation",
          userId: user.id,
          userProfile: {
            age: profile.age,
            goals: profile.goals,
            dietaryRestrictions: profile.dietaryRestrictions,
          }
        })

        setError(appError.userMessage)
        // Toast is already shown by handleClientError
      } finally {
        setGeneratingMealPlan(false)
      }
    },
    [setCurrentMealPlan, setGeneratingMealPlan, setError, router, isAuthenticated, user]
  )

  const regenerateMeal = useCallback(
    async (meal: Meal, context?: string) => {
      if (!userProfile || !currentMealPlan) {
        const error = new Error("User profile or meal plan not found")
        handleClientError(error, {
          operation: "meal-regeneration",
          mealId: meal.id,
          hasUserProfile: !!userProfile,
          hasMealPlan: !!currentMealPlan
        })
        return
      }

      const performance = monitorPerformance("client-meal-regeneration")
      setError(null)
      setRegeneratingMeal(meal.id)

      try {
        logger.info("Starting meal regeneration", {
          mealId: meal.id,
          mealType: meal.type,
          day: meal.day,
          userId: userProfile.id,
          context: context || "none"
        })

        const { meal: newMeal, shoppingList } = await mealPlanAPI.regenerateMeal(
          meal,
          currentMealPlan.meals,
          userProfile,
          context
        )
        
        updateMealAndShoppingList(newMeal, shoppingList)
        
        const duration = performance.finish({
          mealId: meal.id,
          newMealId: newMeal.id,
          userId: userProfile.id
        })
        
        logger.info("Meal regeneration completed successfully", {
          originalMealId: meal.id,
          newMealId: newMeal.id,
          mealType: meal.type,
          day: meal.day,
          duration: `${duration}ms`,
          userId: userProfile.id
        })
        
        toast.success("Meal and shopping list updated successfully!")
      } catch (error) {
        performance.finish({ mealId: meal.id, error: true })
        
        const appError = handleClientError(error, {
          operation: "meal-regeneration",
          mealId: meal.id,
          mealType: meal.type,
          userId: userProfile.id,
          context: context || "none"
        })

        setError(appError.userMessage)
        // Toast is already shown by handleClientError
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
