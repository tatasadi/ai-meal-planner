import { getContainer, initializeCosmosDB } from '../cosmos-db'
import { GroceryList, GroceryItem } from '../types'
import { v4 as uuidv4 } from 'uuid'

/**
 * Data access layer for Grocery Lists
 */
export class GroceryListsDAO {
  private static instance: GroceryListsDAO
  
  public static getInstance(): GroceryListsDAO {
    if (!GroceryListsDAO.instance) {
      GroceryListsDAO.instance = new GroceryListsDAO()
    }
    return GroceryListsDAO.instance
  }

  private constructor() {}

  /**
   * Initialize the DAO - ensures Cosmos DB is ready
   */
  async initialize(): Promise<void> {
    await initializeCosmosDB()
  }

  /**
   * Create a new grocery list
   */
  async createGroceryList(groceryList: Omit<GroceryList, 'id' | 'createdAt' | 'updatedAt'>): Promise<GroceryList> {
    await this.initialize()
    
    const container = getContainer('groceryLists')
    const now = new Date()
    const newGroceryList: GroceryList = {
      ...groceryList,
      id: uuidv4(),
      items: groceryList.items.map(item => ({
        ...item,
        id: item.id || uuidv4()
      })),
      createdAt: now,
      updatedAt: now
    }

    try {
      const { resource } = await container.items.create(newGroceryList)
      if (!resource) {
        throw new Error('Failed to create grocery list')
      }
      return resource as GroceryList
    } catch (error: any) {
      throw new Error(`Failed to create grocery list: ${error.message}`)
    }
  }

  /**
   * Get grocery list by ID
   */
  async getGroceryList(groceryListId: string, userId: string): Promise<GroceryList | null> {
    await this.initialize()
    
    const container = getContainer('groceryLists')
    
    try {
      const { resource } = await container.item(groceryListId, userId).read<GroceryList>()
      return resource || null
    } catch (error: any) {
      if (error.code === 404) {
        return null
      }
      throw new Error(`Failed to get grocery list: ${error.message}`)
    }
  }

  /**
   * Get grocery list by meal plan ID
   */
  async getGroceryListByMealPlan(mealPlanId: string, userId: string): Promise<GroceryList | null> {
    await this.initialize()
    
    const container = getContainer('groceryLists')
    
    try {
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.userId = @userId 
          AND c.mealPlanId = @mealPlanId
        `,
        parameters: [
          { name: '@userId', value: userId },
          { name: '@mealPlanId', value: mealPlanId }
        ]
      }
      
      const { resources } = await container.items.query<GroceryList>(querySpec).fetchAll()
      return resources.length > 0 ? resources[0] : null
    } catch (error: any) {
      throw new Error(`Failed to get grocery list by meal plan: ${error.message}`)
    }
  }

  /**
   * Get all grocery lists for a user
   */
  async getUserGroceryLists(userId: string, limit: number = 20): Promise<GroceryList[]> {
    await this.initialize()
    
    const container = getContainer('groceryLists')
    
    try {
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.userId = @userId 
          ORDER BY c.createdAt DESC
        `,
        parameters: [
          { name: '@userId', value: userId }
        ]
      }
      
      const { resources } = await container.items
        .query<GroceryList>(querySpec, { maxItemCount: limit })
        .fetchAll()
      return resources
    } catch (error: any) {
      throw new Error(`Failed to get user grocery lists: ${error.message}`)
    }
  }

  /**
   * Update grocery list
   */
  async updateGroceryList(groceryListId: string, userId: string, updates: Partial<GroceryList>): Promise<GroceryList> {
    await this.initialize()
    
    const container = getContainer('groceryLists')
    
    try {
      const existingList = await this.getGroceryList(groceryListId, userId)
      if (!existingList) {
        throw new Error('Grocery list not found')
      }

      const updatedList: GroceryList = {
        ...existingList,
        ...updates,
        id: groceryListId,
        userId,
        updatedAt: new Date()
      }

      // Ensure item IDs are set
      if (updatedList.items) {
        updatedList.items = updatedList.items.map(item => ({
          ...item,
          id: item.id || uuidv4()
        }))
      }

      const { resource } = await container.item(groceryListId, userId).replace(updatedList)
      if (!resource) {
        throw new Error('Failed to update grocery list')
      }
      return resource as GroceryList
    } catch (error: any) {
      throw new Error(`Failed to update grocery list: ${error.message}`)
    }
  }

  /**
   * Toggle item checked status
   */
  async toggleGroceryItem(groceryListId: string, userId: string, itemId: string): Promise<GroceryList> {
    await this.initialize()
    
    try {
      const groceryList = await this.getGroceryList(groceryListId, userId)
      if (!groceryList) {
        throw new Error('Grocery list not found')
      }

      const updatedItems = groceryList.items.map(item => {
        if (item.id === itemId) {
          return { ...item, checked: !item.checked }
        }
        return item
      })

      return await this.updateGroceryList(groceryListId, userId, { items: updatedItems })
    } catch (error: any) {
      throw new Error(`Failed to toggle grocery item: ${error.message}`)
    }
  }

  /**
   * Add item to grocery list
   */
  async addGroceryItem(groceryListId: string, userId: string, item: Omit<GroceryItem, 'id'>): Promise<GroceryList> {
    await this.initialize()
    
    try {
      const groceryList = await this.getGroceryList(groceryListId, userId)
      if (!groceryList) {
        throw new Error('Grocery list not found')
      }

      const newItem: GroceryItem = {
        ...item,
        id: uuidv4()
      }

      const updatedItems = [...groceryList.items, newItem]
      return await this.updateGroceryList(groceryListId, userId, { items: updatedItems })
    } catch (error: any) {
      throw new Error(`Failed to add grocery item: ${error.message}`)
    }
  }

  /**
   * Remove item from grocery list
   */
  async removeGroceryItem(groceryListId: string, userId: string, itemId: string): Promise<GroceryList> {
    await this.initialize()
    
    try {
      const groceryList = await this.getGroceryList(groceryListId, userId)
      if (!groceryList) {
        throw new Error('Grocery list not found')
      }

      const updatedItems = groceryList.items.filter(item => item.id !== itemId)
      return await this.updateGroceryList(groceryListId, userId, { items: updatedItems })
    } catch (error: any) {
      throw new Error(`Failed to remove grocery item: ${error.message}`)
    }
  }

  /**
   * Delete grocery list
   */
  async deleteGroceryList(groceryListId: string, userId: string): Promise<boolean> {
    await this.initialize()
    
    const container = getContainer('groceryLists')
    
    try {
      await container.item(groceryListId, userId).delete()
      return true
    } catch (error: any) {
      if (error.code === 404) {
        return false
      }
      throw new Error(`Failed to delete grocery list: ${error.message}`)
    }
  }

  /**
   * Generate grocery list from meal plan
   */
  async generateFromMealPlan(mealPlanId: string, userId: string, meals: any[]): Promise<GroceryList> {
    await this.initialize()
    
    // Check if grocery list already exists for this meal plan
    const existing = await this.getGroceryListByMealPlan(mealPlanId, userId)
    if (existing) {
      return existing
    }

    // Extract ingredients from meals and categorize
    const ingredientMap = new Map<string, GroceryItem>()
    
    meals.forEach(meal => {
      meal.ingredients?.forEach((ingredient: string) => {
        const normalized = ingredient.toLowerCase().trim()
        if (!ingredientMap.has(normalized)) {
          ingredientMap.set(normalized, {
            id: uuidv4(),
            name: ingredient,
            quantity: '1', // Default quantity
            category: this.categorizeIngredient(ingredient),
            checked: false
          })
        }
      })
    })

    const groceryListData = {
      userId,
      mealPlanId,
      items: Array.from(ingredientMap.values())
    }

    return await this.createGroceryList(groceryListData)
  }

  /**
   * Simple ingredient categorization
   */
  private categorizeIngredient(ingredient: string): GroceryItem['category'] {
    const lowerIngredient = ingredient.toLowerCase()
    
    if (lowerIngredient.match(/\b(chicken|beef|pork|fish|salmon|tuna|turkey|bacon|egg|tofu)\b/)) {
      return 'protein'
    }
    if (lowerIngredient.match(/\b(apple|banana|orange|tomato|onion|carrot|lettuce|spinach|potato|broccoli)\b/)) {
      return 'produce'
    }
    if (lowerIngredient.match(/\b(milk|cheese|yogurt|butter|cream)\b/)) {
      return 'dairy'
    }
    if (lowerIngredient.match(/\b(salt|pepper|garlic|oregano|basil|cumin|paprika|thyme)\b/)) {
      return 'spices'
    }
    if (lowerIngredient.match(/\b(rice|pasta|bread|flour|oil|vinegar|sugar|beans|lentils)\b/)) {
      return 'pantry'
    }
    
    return 'other'
  }
}

// Export singleton instance
export const groceryListsDAO = GroceryListsDAO.getInstance()