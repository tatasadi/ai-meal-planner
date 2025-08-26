import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Users } from "lucide-react"
import type { Meal } from "@/lib/types"

interface MealCardProps {
  meal: Meal
  onRegenerate?: () => void
}

export function MealCard({ meal, onRegenerate }: MealCardProps) {
  const mealTypeColors = {
    breakfast: "bg-orange-50 border-orange-200",
    lunch: "bg-blue-50 border-blue-200",
    dinner: "bg-purple-50 border-purple-200",
  }

  return (
    <Card className={`${mealTypeColors[meal.type]} transition-colors hover:shadow-md`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg capitalize">{meal.type}</CardTitle>
          <span className="text-xs px-2 py-1 bg-white rounded-full font-medium">
            Day {meal.day}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <h3 className="font-semibold text-base mb-1">{meal.name}</h3>
          <p className="text-sm text-muted-foreground">{meal.description}</p>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{meal.prepTime} min</span>
          </div>
          <div className="flex items-center gap-1">
            <span>⚡</span>
            <span>{meal.estimatedCalories} cal</span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Ingredients:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            {meal.ingredients.slice(0, 4).map((ingredient, index) => (
              <li key={index}>• {ingredient}</li>
            ))}
            {meal.ingredients.length > 4 && (
              <li className="italic">+{meal.ingredients.length - 4} more ingredients</li>
            )}
          </ul>
        </div>

        {onRegenerate && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            className="w-full mt-3"
          >
            Regenerate this meal
          </Button>
        )}
      </CardContent>
    </Card>
  )
}