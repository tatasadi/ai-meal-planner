"use client"

import { useState } from "react"
import { MealCard } from "@/src/components/meal/meal-card"
import { ChatInterface } from "@/src/components/chat/chat-interface"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"
import type { Meal, ChatMessage } from "@/src/lib/types"

// Mock data for demonstration
const mockMeals: Meal[] = [
  {
    id: "1",
    day: 1,
    type: "breakfast",
    name: "Greek Yogurt Parfait",
    description: "Creamy Greek yogurt layered with fresh berries and granola",
    ingredients: ["Greek yogurt", "Mixed berries", "Granola", "Honey", "Chia seeds"],
    estimatedCalories: 320,
    prepTime: 5,
  },
  {
    id: "2",
    day: 1,
    type: "lunch",
    name: "Grilled Chicken Salad",
    description: "Fresh mixed greens with grilled chicken breast and balsamic vinaigrette",
    ingredients: ["Chicken breast", "Mixed greens", "Cherry tomatoes", "Cucumber", "Balsamic vinaigrette"],
    estimatedCalories: 450,
    prepTime: 20,
  },
  {
    id: "3",
    day: 1,
    type: "dinner",
    name: "Baked Salmon with Quinoa",
    description: "Herb-crusted salmon served with fluffy quinoa and steamed vegetables",
    ingredients: ["Salmon fillet", "Quinoa", "Broccoli", "Carrots", "Herbs", "Olive oil"],
    estimatedCalories: 520,
    prepTime: 30,
  },
]

export default function DashboardPage() {
  const [meals, setMeals] = useState<Meal[]>(mockMeals)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

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

  const handleRegenerateMeal = (mealId: string) => {
    console.log("Regenerating meal:", mealId)
  }

  const handleRegenerateAll = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      console.log("All meals regenerated!")
    }, 2000)
  }

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
              disabled={isGenerating}
              size="lg"
              className="shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isGenerating ? (
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {dayMeals.map((meal, mealIndex) => (
                      <div 
                        key={meal.id}
                        className="animate-scale-in"
                        style={{ animationDelay: `${(dayIndex * 3 + mealIndex) * 100}ms` }}
                      >
                        <MealCard
                          meal={meal}
                          onRegenerate={() => handleRegenerateMeal(meal.id)}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
            <Card className="card-elevated border-0 shadow-xl sticky top-6">
              <ChatInterface
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                isLoading={false}
              />
            </Card>

            <Card className="card-elevated border-0 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-chart-1/10 flex items-center justify-center">
                    <span className="text-xs">🛒</span>
                  </div>
                  Shopping List
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Generated from your meal plan
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    "Greek yogurt",
                    "Mixed berries", 
                    "Chicken breast",
                    "Salmon fillet",
                    "Quinoa",
                    "Mixed greens",
                    "Broccoli & carrots"
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm group hover:bg-white/5 p-2 rounded-lg transition-colors cursor-pointer">
                      <div className="w-4 h-4 rounded border-2 border-primary/30 flex items-center justify-center hover:border-primary transition-colors group-hover:border-primary/50">
                        <div className="w-2 h-2 rounded-full bg-primary/0 group-hover:bg-primary/60 transition-colors"></div>
                      </div>
                      <span className="text-foreground/90 group-hover:text-foreground">{item}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-4 h-4"></div>
                    <span className="text-muted-foreground italic">+8 more items</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}