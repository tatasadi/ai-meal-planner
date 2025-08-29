import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Clock, Zap, Utensils, RefreshCw } from "lucide-react"
import type { Meal } from "@/lib/types"

interface MealDetailsDialogProps {
  meal: Meal | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onRegenerate?: () => void
  isRegenerating?: boolean
}

export function MealDetailsDialog({
  meal,
  isOpen,
  onOpenChange,
  onRegenerate,
  isRegenerating,
}: MealDetailsDialogProps) {
  if (!meal) return null

  const mealTypeConfig = {
    breakfast: {
      gradient: "meal-card-gradient-breakfast",
      icon: "🌅",
      color: "text-meal-breakfast",
      accentColor: "var(--meal-breakfast)",
    },
    lunch: {
      gradient: "meal-card-gradient-lunch",
      icon: "☀️",
      color: "text-meal-lunch",
      accentColor: "var(--meal-lunch)",
    },
    dinner: {
      gradient: "meal-card-gradient-dinner",
      icon: "🌙",
      color: "text-meal-dinner",
      accentColor: "var(--meal-dinner)",
    },
  }

  const config = mealTypeConfig[meal.type as keyof typeof mealTypeConfig]

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl">{config.icon}</div>
            <div>
              <DialogTitle className="text-2xl font-bold text-left">
                {meal.name}
              </DialogTitle>
              <div className="flex items-center gap-4 mt-2">
                <span className={`text-sm font-semibold capitalize ${config.color}`}>
                  {meal.type}
                </span>
                <span className="text-sm text-muted-foreground">Day {meal.day}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Description</h3>
            <p className="text-muted-foreground leading-relaxed">
              {meal.description}
            </p>
          </div>

          {/* Nutrition Info */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
              <Clock className="w-4 h-4" />
              <span className="font-semibold">{meal.prepTime} minutes</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
              <Zap className="w-4 h-4" />
              <span className="font-semibold">{meal.estimatedCalories} calories</span>
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Utensils className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Ingredients</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {meal.ingredients.map((ingredient: string, index: number) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: config.accentColor }}
                  ></div>
                  <span className="text-sm font-medium">{ingredient}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {onRegenerate && (
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="min-w-[140px]"
              >
                {isRegenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate Meal
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}