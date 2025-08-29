"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MealCard } from "@/components/meal/meal-card"
import { MealDetailsDialog } from "@/components/meal/meal-details-dialog"
import { ChatInterface } from "@/components/chat/chat-interface"
import { ShoppingListDialog } from "@/components/ui/shopping-list-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, AlertCircle } from "lucide-react"
import { useMealPlanStore } from "@/store"
import { useMealGeneration } from "@/hooks/use-meal-generation"
import { LoadingState } from "@/components/ui/loading-state"
import type { Meal, ChatMessage } from "@/lib/types"


export default function DashboardPage() {
  const router = useRouter()
  const { currentMealPlan, userProfile } = useMealPlanStore()
  const { regenerateMeal, generateMealPlan, isGeneratingMealPlan, regeneratingMealId, error } = useMealGeneration()
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null)
  const [isMealDialogOpen, setIsMealDialogOpen] = useState(false)
  
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
    if (!currentMealPlan && !userProfile) {
      router.push('/onboarding')
    }
  }, [currentMealPlan, userProfile, router])
  
  if (isGeneratingMealPlan) {
    return <LoadingState message="Generating your personalized meal plan..." />
  }
  
  if (error) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <Card className="card-elevated border-0 shadow-xl max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/onboarding')}>
                Start Over
              </Button>
              <Button onClick={handleRegenerateAll}>
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

  const handleSendMessage = (message: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: "user-1",
      mealPlanId: "plan-1",
      role: "user",
      content: message,
      timestamp: new Date(),
    }

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      userId: "user-1",
      mealPlanId: "plan-1",
      role: "assistant",
      content: "I understand you'd like to modify your meal plan. This feature will be connected to AI in the next phase!",
      timestamp: new Date(),
    }

    setChatMessages(prev => [...prev, userMessage, assistantMessage])
  }

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

  // Get the current selected meal from the store (updated after regeneration)
  const selectedMeal = selectedMealId ? meals.find(m => m.id === selectedMealId) || null : null

  const groupedMeals = meals.reduce((acc, meal) => {
    const day = `Day ${meal.day}`
    if (!acc[day]) acc[day] = []
    acc[day].push(meal)
    return acc
  }, {} as Record<string, Meal[]>)

  return (
    <div className="min-h-screen gradient-bg">
      <div className="max-w-7xl mx-auto p-6">
        <header className="mb-12 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8 animate-slide-up">
            {Object.entries(groupedMeals).map(([day, dayMeals], dayIndex) => (
              <Card key={day} className="card-elevated border-0 shadow-xl" style={{ animationDelay: `${dayIndex * 100}ms` }}>
                <CardHeader className="pb-6">
                  <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{dayIndex + 1}</span>
                    </div>
                    {day}
                  </CardTitle>
                  <p className="text-muted-foreground">Your personalized meals for the day</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                    {dayMeals.map((meal, mealIndex) => (
                      <div 
                        key={meal.id}
                        className="animate-scale-in h-full"
                        style={{ animationDelay: `${(dayIndex * 3 + mealIndex) * 100}ms` }}
                      >
                        <MealCard
                          meal={meal}
                          onRegenerate={() => handleRegenerateMeal(meal.id)}
                          isRegenerating={regeneratingMealId === meal.id}
                          onClick={() => handleMealClick(meal)}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <Card className="card-elevated border-0 shadow-xl">
              <ChatInterface
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                isLoading={false}
              />
            </Card>

            <ShoppingListDialog 
              mealPlan={currentMealPlan}
              previewItems={groceryItems}
            />
          </div>
        </div>

        {/* Meal Details Dialog */}
        <MealDetailsDialog
          meal={selectedMeal}
          isOpen={isMealDialogOpen}
          onOpenChange={setIsMealDialogOpen}
          onRegenerate={handleMealDialogRegenerate}
          isRegenerating={selectedMeal ? regeneratingMealId === selectedMeal.id : false}
        />
      </div>
    </div>
  )
}