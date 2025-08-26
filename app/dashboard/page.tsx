"use client"

import { useState } from "react"
import { MealCard } from "@/src/components/meal/meal-card"
import { ChatInterface } from "@/src/components/chat/chat-interface"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Meal Plan</h1>
          <p className="text-muted-foreground">Personalized 3-day meal plan based on your profile</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Meals</h2>
              <Button onClick={handleRegenerateAll} disabled={isGenerating}>
                {isGenerating ? "Generating..." : "Regenerate All Meals"}
              </Button>
            </div>

            {Object.entries(groupedMeals).map(([day, dayMeals]) => (
              <Card key={day}>
                <CardHeader>
                  <CardTitle className="text-lg">{day}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {dayMeals.map((meal) => (
                      <MealCard
                        key={meal.id}
                        meal={meal}
                        onRegenerate={() => handleRegenerateMeal(meal.id)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            <ChatInterface
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              isLoading={false}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Grocery List</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Based on your 3-day meal plan
                </p>
                <ul className="text-sm space-y-1">
                  <li>• Greek yogurt</li>
                  <li>• Mixed berries</li>
                  <li>• Chicken breast</li>
                  <li>• Salmon fillet</li>
                  <li>• Quinoa</li>
                  <li>• Mixed greens</li>
                  <li>• Broccoli & carrots</li>
                  <li className="text-muted-foreground italic">+8 more items</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}