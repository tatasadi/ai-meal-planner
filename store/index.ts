import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"
import type { UserProfile, MealPlan, Meal } from "@/lib/types"

interface MealPlanState {
  // User data
  userProfile: UserProfile | null
  setUserProfile: (profile: UserProfile) => void

  // Meal plan data
  currentMealPlan: MealPlan | null
  setCurrentMealPlan: (plan: MealPlan) => void

  // Loading states
  isGeneratingMealPlan: boolean
  regeneratingMealId: string | null
  setGeneratingMealPlan: (loading: boolean) => void
  setRegeneratingMeal: (mealId: string | null) => void

  // Error handling
  error: string | null
  setError: (error: string | null) => void

  // Meal operations
  updateMeal: (updatedMeal: Meal) => void
  clearMealPlan: () => void
  clearAll: () => void
}

export const useMealPlanStore = create<MealPlanState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        userProfile: null,
        currentMealPlan: null,
        isGeneratingMealPlan: false,
        regeneratingMealId: null,
        error: null,

        // User profile actions
        setUserProfile: (profile: UserProfile) =>
          set({ userProfile: profile }, false, "setUserProfile"),

        // Meal plan actions
        setCurrentMealPlan: (plan: MealPlan) =>
          set({ currentMealPlan: plan }, false, "setCurrentMealPlan"),

        // Loading state actions
        setGeneratingMealPlan: (loading: boolean) =>
          set(
            { isGeneratingMealPlan: loading },
            false,
            "setGeneratingMealPlan"
          ),

        setRegeneratingMeal: (mealId: string | null) =>
          set({ regeneratingMealId: mealId }, false, "setRegeneratingMeal"),

        // Error handling
        setError: (error: string | null) => set({ error }, false, "setError"),

        // Meal operations
        updateMeal: (updatedMeal: Meal) => {
          const { currentMealPlan } = get()
          if (!currentMealPlan) return

          const updatedMeals = currentMealPlan.meals.map((meal) =>
            meal.id === updatedMeal.id ? updatedMeal : meal
          )

          set(
            {
              currentMealPlan: {
                ...currentMealPlan,
                meals: updatedMeals,
                updatedAt: new Date(),
              },
            },
            false,
            "updateMeal"
          )
        },

        // Clear actions
        clearMealPlan: () =>
          set({ currentMealPlan: null }, false, "clearMealPlan"),

        clearAll: () =>
          set(
            {
              userProfile: null,
              currentMealPlan: null,
              isGeneratingMealPlan: false,
              regeneratingMealId: null,
              error: null,
            },
            false,
            "clearAll"
          ),
      }),
      {
        name: "meal-plan-storage",
        partialize: (state) => ({
          userProfile: state.userProfile,
          currentMealPlan: state.currentMealPlan,
        }),
      }
    ),
    {
      name: "meal-plan-store",
    }
  )
)
