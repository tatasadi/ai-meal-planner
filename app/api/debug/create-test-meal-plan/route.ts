import { NextRequest, NextResponse } from 'next/server'
import { mealPlansDAO } from '@/lib/data'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body
    
    const mealPlan = await mealPlansDAO.createMealPlan({
      userId,
      title: "Simple Test Meal Plan",
      duration: 3,
      meals: [
        {
          id: "meal-1",
          day: 1,
          type: "breakfast",
          name: "Scrambled Eggs",
          description: "Simple scrambled eggs",
          ingredients: ["2 eggs", "butter", "salt"],
          estimatedCalories: 200,
          prepTime: 5
        },
        {
          id: "meal-2", 
          day: 1,
          type: "lunch",
          name: "Sandwich",
          description: "Ham sandwich",
          ingredients: ["bread", "ham", "cheese"],
          estimatedCalories: 400,
          prepTime: 2
        }
      ],
      shoppingList: [
        {
          name: "Dairy",
          icon: "🥛", 
          items: ["eggs", "butter", "cheese"]
        },
        {
          name: "Meat",
          icon: "🥩",
          items: ["ham"]
        }
      ]
    })
    
    return NextResponse.json(mealPlan)
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}