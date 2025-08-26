import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Zap, RefreshCw, Utensils } from "lucide-react"
import type { Meal } from "@/lib/types"

interface MealCardProps {
  meal: Meal
  onRegenerate?: () => void
}

export function MealCard({ meal, onRegenerate }: MealCardProps) {
  const mealTypeConfig = {
    breakfast: {
      gradient: "meal-card-gradient-breakfast",
      icon: "🌅",
      color: "text-amber-400",
      accentColor: "oklch(0.75 0.15 45)"
    },
    lunch: {
      gradient: "meal-card-gradient-lunch", 
      icon: "☀️",
      color: "text-blue-400",
      accentColor: "oklch(0.72 0.18 210)"
    },
    dinner: {
      gradient: "meal-card-gradient-dinner",
      icon: "🌙",
      color: "text-purple-400",
      accentColor: "oklch(0.74 0.16 280)"
    },
  }

  const config = mealTypeConfig[meal.type as keyof typeof mealTypeConfig]

  return (
    <Card className={`card-hover ${config.gradient} shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group border-0`}>
      <CardHeader className="pb-4 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{config.icon}</div>
            <div>
              <CardTitle className={`text-lg capitalize ${config.color} font-semibold`}>
                {meal.type}
              </CardTitle>
              <p className="text-xs text-white/60">Day {meal.day}</p>
            </div>
          </div>
          
          <div className="px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 shadow-sm">
            <span className="text-xs font-semibold text-white">
              Day {meal.day}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg leading-tight text-white group-hover:text-white/90 transition-colors">
            {meal.name}
          </h3>
          <p className="text-sm text-white/75 leading-relaxed">
            {meal.description}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/20 text-white">
            <Clock className="w-3 h-3" />
            <span className="font-semibold">{meal.prepTime}m</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/20 text-white">
            <Zap className="w-3 h-3" />
            <span className="font-semibold">{meal.estimatedCalories} cal</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4 text-white/80" />
            <h4 className="text-sm font-semibold text-white">Ingredients</h4>
          </div>
          
          <div className="grid grid-cols-1 gap-1.5">
            {meal.ingredients.slice(0, 3).map((ingredient: string, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.accentColor }}></div>
                <span className="text-xs text-white/90 font-medium">{ingredient}</span>
              </div>
            ))}
            {meal.ingredients.length > 3 && (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>
                <span className="text-xs text-white/70 italic">
                  +{meal.ingredients.length - 3} more
                </span>
              </div>
            )}
          </div>
        </div>

        {onRegenerate && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            className="w-full mt-4 h-9 text-sm hover:bg-primary hover:text-primary-foreground transition-all duration-200 group-hover:border-primary/50"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Regenerate meal
          </Button>
        )}
      </CardContent>
    </Card>
  )
}