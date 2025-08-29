"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, ShoppingCart } from "lucide-react"
import type { MealPlan } from "@/lib/types"

interface ShoppingListDialogProps {
  mealPlan: MealPlan | null
  previewItems?: string[]
}

export function ShoppingListDialog({
  mealPlan,
  previewItems = [],
}: ShoppingListDialogProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  if (!mealPlan) return null

  // Use AI-generated shopping list from the meal plan
  // Fallback to unique ingredients for backward compatibility with old meal plans
  const allIngredients = mealPlan.shoppingList?.length 
    ? mealPlan.shoppingList 
    : Array.from(new Set(mealPlan.meals.flatMap(meal => meal.ingredients))).sort()

  const toggleItem = (item: string) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(item)) {
      newChecked.delete(item)
    } else {
      newChecked.add(item)
    }
    setCheckedItems(newChecked)
  }

  const checkedCount = checkedItems.size
  const totalCount = allIngredients.length
  const completionPercentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="card-elevated border-0 shadow-xl cursor-pointer hover:shadow-2xl transition-all duration-300 card-hover">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-chart-1/10 flex items-center justify-center">
                <span className="text-xs">🛒</span>
              </div>
              Shopping List
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Generated from your meal plan • Click to view full list
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {previewItems.map((item, index) => (
                <div key={index} className="flex items-center gap-3 text-sm p-2">
                  <div className="w-4 h-4 rounded border-2 border-primary/30 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary/0"></div>
                  </div>
                  <span className="text-foreground/90">{item}</span>
                </div>
              ))}
              {allIngredients.length > previewItems.length && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-4 h-4"></div>
                  <span className="text-muted-foreground italic">
                    +{allIngredients.length - previewItems.length} more items
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-8">
            <ShoppingCart className="w-5 h-5" />
            Shopping List
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground font-normal">
              <div className="flex items-center gap-1">
                <Check className="w-4 h-4 text-green-600" />
                {checkedCount}/{totalCount}
              </div>
              <span>({completionPercentage}%)</span>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-2">
            {allIngredients.map((ingredient, index) => {
              const isChecked = checkedItems.has(ingredient)
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:bg-accent/50 ${
                    isChecked 
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleItem(ingredient)}
                >
                  <div 
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                      isChecked 
                        ? 'bg-green-600 border-green-600' 
                        : 'border-primary/30 hover:border-primary/60'
                    }`}
                  >
                    {isChecked && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span 
                    className={`flex-1 transition-all duration-200 ${
                      isChecked 
                        ? 'text-muted-foreground line-through' 
                        : 'text-foreground'
                    }`}
                  >
                    {ingredient}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {totalCount > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Progress: {checkedCount} of {totalCount} items completed
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCheckedItems(new Set())}
                disabled={checkedItems.size === 0}
              >
                Clear All
              </Button>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}