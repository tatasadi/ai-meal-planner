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
import { Check, ShoppingCart, ChevronDown, ChevronRight } from "lucide-react"
import type { MealPlan, ShoppingCategory } from "@/lib/types"

interface ShoppingListDialogProps {
  mealPlan: MealPlan | null
  previewItems?: string[]
}

export function ShoppingListDialog({
  mealPlan,
  previewItems = [],
}: ShoppingListDialogProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  if (!mealPlan) return null

  // Use AI-generated categorized shopping list from the meal plan
  // Fallback to create basic categories for backward compatibility
  const shoppingCategories: ShoppingCategory[] = mealPlan.shoppingList?.length 
    ? mealPlan.shoppingList 
    : [
        {
          name: "All Items",
          icon: "📝",
          items: Array.from(new Set(mealPlan.meals.flatMap(meal => meal.ingredients))).sort()
        }
      ]

  // Flatten all items for counting
  const allItems = shoppingCategories.flatMap(category => category.items)

  const toggleItem = (item: string) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(item)) {
      newChecked.delete(item)
    } else {
      newChecked.add(item)
    }
    setCheckedItems(newChecked)
  }

  const toggleCategory = (categoryName: string) => {
    const newCollapsed = new Set(collapsedCategories)
    if (newCollapsed.has(categoryName)) {
      newCollapsed.delete(categoryName)
    } else {
      newCollapsed.add(categoryName)
    }
    setCollapsedCategories(newCollapsed)
  }

  const checkedCount = checkedItems.size
  const totalCount = allItems.length
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
              {allItems.length > previewItems.length && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-4 h-4"></div>
                  <span className="text-muted-foreground italic">
                    +{allItems.length - previewItems.length} more items in {shoppingCategories.length} categories
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
          <div className="space-y-4">
            {shoppingCategories.map((category, categoryIndex) => {
              const isCollapsed = collapsedCategories.has(category.name)
              const categoryItems = category.items || []
              const checkedInCategory = categoryItems.filter(item => checkedItems.has(item)).length
              
              return (
                <div key={categoryIndex} className="space-y-2">
                  {/* Category Header */}
                  <div 
                    className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => toggleCategory(category.name)}
                  >
                    <span className="text-lg">{category.icon}</span>
                    <h3 className="font-semibold text-foreground flex-1">
                      {category.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{checkedInCategory}/{categoryItems.length}</span>
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {/* Category Items */}
                  {!isCollapsed && (
                    <div className="space-y-1 ml-4">
                      {categoryItems.map((item, itemIndex) => {
                        const isChecked = checkedItems.has(item)
                        return (
                          <div
                            key={itemIndex}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:bg-accent/30 ${
                              isChecked 
                                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => toggleItem(item)}
                          >
                            <div 
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                                isChecked 
                                  ? 'bg-green-600 border-green-600' 
                                  : 'border-primary/30 hover:border-primary/60'
                              }`}
                            >
                              {isChecked && (
                                <Check className="w-2.5 h-2.5 text-white" />
                              )}
                            </div>
                            <span 
                              className={`flex-1 text-sm transition-all duration-200 ${
                                isChecked 
                                  ? 'text-muted-foreground line-through' 
                                  : 'text-foreground'
                              }`}
                            >
                              {item}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
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