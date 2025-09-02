"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { MealCard } from "@/components/meal/meal-card"
import { MealDetailsDialog } from "@/components/meal/meal-details-dialog"
import { ChatInterface } from "@/components/chat/chat-interface"
import { ShoppingListDialog } from "@/components/ui/shopping-list-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { useMealPlanStore } from "@/store"
import { useMealGeneration } from "@/hooks/use-meal-generation"
import { useChatWithActions } from "@/hooks/use-chat-with-actions"
import { useDataSync } from "@/hooks/use-data-sync"
import { LoadingState } from "@/components/ui/loading-state"
import { PageErrorBoundary, ComponentErrorBoundary } from "@/components/error/error-boundary"
import type { Meal, ChatMessage } from "@/lib/types"


export default function DashboardPage() {
  const router = useRouter()
  const { currentMealPlan, userProfile, updateMealPlan, hasHydrated } = useMealPlanStore()
  const { regenerateMeal, generateMealPlan, isGeneratingMealPlan, regeneratingMealId, error } = useMealGeneration()
  const { 
    isLoading: isLoadingData, 
    hasLoadedInitialData, 
    needsOnboarding, 
    hasMealPlan,
    error: dataError,
    refreshData 
  } = useDataSync()
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null)
  const [isMealDialogOpen, setIsMealDialogOpen] = useState(false)
  const [currentDay, setCurrentDay] = useState(1)
  
  // Chat functionality with actions
  const {
    messages: chatMessages,
    sendMessage,
    isLoading: isChatLoading,
    error: chatError,
    isProcessingAction,
    modifyingMealId,
  } = useChatWithActions({
    mealPlan: currentMealPlan,
    userProfile,
    onMealPlanUpdate: (updatedMeals, updatedShoppingList) => {
      if (currentMealPlan) {
        console.log("Dashboard: Updating meal plan with calories:", updatedMeals.map(m => `${m.name}: ${m.estimatedCalories} cal`))
        
        const updatedMealPlan = {
          ...currentMealPlan,
          meals: updatedMeals,
          shoppingList: updatedShoppingList,
          updatedAt: new Date(),
        }
        console.log("Dashboard: New meal plan calories:", updatedMealPlan.meals.map(m => `${m.name}: ${m.estimatedCalories} cal`))
        updateMealPlan(updatedMealPlan)
      }
    },
  })
  
  const handleRegenerateAll = async () => {
    if (userProfile) {
      await generateMealPlan(userProfile)
    }
  }

  // Generate grocery list from meal plan
  const generateGroceryList = () => {
    if (!currentMealPlan) return []
    
    // Use AI-generated shopping list, with fallback for backward compatibility
    if (currentMealPlan.shoppingList?.length) {
      // Flatten categorized shopping list for preview
      const allItems = currentMealPlan.shoppingList.flatMap(category => category.items)
      return allItems.slice(0, 5) // Show first 5 items as preview
    } else {
      // Fallback for old meal plans without shopping lists
      const allIngredients = currentMealPlan.meals.flatMap(meal => meal.ingredients)
      const uniqueIngredients = Array.from(new Set(allIngredients))
      return uniqueIngredients.slice(0, 5)
    }
  }

  const groceryItems = generateGroceryList()
  
  useEffect(() => {
    // Redirect to onboarding if user needs to complete their profile
    if (needsOnboarding) {
      router.push('/onboarding')
    }
  }, [needsOnboarding, router])
  
  // Show loading state while loading data or generating meal plan
  if (isLoadingData && !hasLoadedInitialData) {
    return <LoadingState message="Loading your meal plan data..." />
  }
  
  if (isGeneratingMealPlan) {
    return <LoadingState message="Generating your personalized meal plan..." />
  }
  
  if (error || dataError) {
    const displayError = error || dataError
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <Card className="card-elevated border-0 shadow-xl max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-6">{displayError}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/onboarding')}>
                Start Over
              </Button>
              <Button onClick={() => {
                if (dataError) {
                  refreshData()
                } else {
                  handleRegenerateAll()
                }
              }}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (!currentMealPlan) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No meal plan found</h1>
          <p className="text-muted-foreground mb-6">Let's create your personalized meal plan</p>
          <Button onClick={() => router.push('/onboarding')}>
            Get Started
          </Button>
        </div>
      </div>
    )
  }
  
  const meals = currentMealPlan.meals


  const handleRegenerateMeal = async (mealId: string) => {
    const meal = meals.find(m => m.id === mealId)
    if (meal && userProfile) {
      await regenerateMeal(meal)
    }
  }

  const handleMealClick = (meal: Meal) => {
    setSelectedMealId(meal.id)
    setIsMealDialogOpen(true)
  }

  const handleMealDialogRegenerate = async () => {
    const selectedMeal = meals.find(m => m.id === selectedMealId)
    if (selectedMeal && userProfile) {
      await regenerateMeal(selectedMeal)
    }
  }

  const handlePrevDay = () => {
    setCurrentDay(prev => Math.max(1, prev - 1))
  }

  const handleNextDay = () => {
    const totalDays = Object.keys(groupedMeals).length
    setCurrentDay(prev => Math.min(totalDays, prev + 1))
  }

  // Get the current selected meal from the store (updated after regeneration)
  const selectedMeal = selectedMealId ? meals.find(m => m.id === selectedMealId) || null : null

  const groupedMeals = meals.reduce((acc, meal) => {
    const day = `Day ${meal.day}`
    if (!acc[day]) acc[day] = []
    acc[day].push(meal)
    return acc
  }, {} as Record<string, Meal[]>)

  const currentDayMeals = groupedMeals[`Day ${currentDay}`] || []
  const totalDays = Object.keys(groupedMeals).length

  return (
    <ProtectedRoute>
      <PageErrorBoundary>
        <div className="min-h-[calc(100vh-4rem)] gradient-bg">
        <div className="max-w-7xl mx-auto p-6">
          <header className="mb-12 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Your Meal Plan
                </h1>
                <p className="text-lg text-muted-foreground">
                  Personalized 3-day meal plan based on your profile
                </p>
              </div>
              
              <Button 
                onClick={handleRegenerateAll} 
                disabled={isGeneratingMealPlan}
                size="lg"
                className="shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isGeneratingMealPlan ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate All
                  </>
                )}
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 animate-slide-up">
              <ComponentErrorBoundary>
                <Card className="card-elevated border-0 shadow-xl">
                  <CardHeader className="pb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">{currentDay}</span>
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-bold text-foreground">
                            Day {currentDay}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {currentDay} of {totalDays}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrevDay}
                          disabled={currentDay === 1}
                          className="h-9 w-9 p-0"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextDay}
                          disabled={currentDay === totalDays}
                          className="h-9 w-9 p-0"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-muted-foreground mt-2">Your personalized meals for the day</p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                      {currentDayMeals.map((meal, mealIndex) => {
                        const isThisMealLoading = regeneratingMealId === meal.id || modifyingMealId === meal.id
                        console.log(`Meal ${meal.id} loading state:`, isThisMealLoading, {regeneratingMealId, modifyingMealId})
                        return (
                        <ComponentErrorBoundary key={meal.id}>
                          <div 
                            className="animate-scale-in h-full"
                            style={{ animationDelay: `${mealIndex * 100}ms` }}
                          >
                            <MealCard
                              meal={meal}
                              onRegenerate={() => handleRegenerateMeal(meal.id)}
                              isRegenerating={isThisMealLoading}
                              onClick={() => handleMealClick(meal)}
                            />
                          </div>
                        </ComponentErrorBoundary>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </ComponentErrorBoundary>
            </div>

            <div className="space-y-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
              <ComponentErrorBoundary>
                <Card className="card-elevated border-0 shadow-xl">
                  <ChatInterface
                    messages={chatMessages}
                    onSendMessage={sendMessage}
                    isLoading={isChatLoading}
                    error={chatError}
                  />
                </Card>
              </ComponentErrorBoundary>

              <ComponentErrorBoundary>
                <ShoppingListDialog 
                  mealPlan={currentMealPlan}
                  previewItems={groceryItems}
                />
              </ComponentErrorBoundary>
            </div>
          </div>

          {/* Meal Details Dialog */}
          <ComponentErrorBoundary>
            <MealDetailsDialog
              meal={selectedMeal}
              isOpen={isMealDialogOpen}
              onOpenChange={setIsMealDialogOpen}
              onRegenerate={handleMealDialogRegenerate}
              isRegenerating={selectedMeal ? regeneratingMealId === selectedMeal.id : false}
            />
          </ComponentErrorBoundary>
          </div>
        </div>
      </PageErrorBoundary>
    </ProtectedRoute>
  )
}