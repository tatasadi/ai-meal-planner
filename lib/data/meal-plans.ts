import { getContainer, initializeCosmosDB } from '../cosmos-db'
import { MealPlan, Meal } from '../types'
import { v4 as uuidv4 } from 'uuid'

/**
 * Data access layer for Meal Plans
 */
export class MealPlansDAO {
  private static instance: MealPlansDAO
  
  public static getInstance(): MealPlansDAO {
    if (!MealPlansDAO.instance) {
      MealPlansDAO.instance = new MealPlansDAO()
    }
    return MealPlansDAO.instance
  }

  private constructor() {}

  /**
   * Initialize the DAO - ensures Cosmos DB is ready
   */
  async initialize(): Promise<void> {
    await initializeCosmosDB()
  }

  /**
   * Create a new meal plan
   */
  async createMealPlan(mealPlan: Omit<MealPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<MealPlan> {
    await this.initialize()
    
    const container = getContainer('mealPlans')
    const now = new Date()
    const newMealPlan: MealPlan = {
      ...mealPlan,
      id: uuidv4(),
      meals: mealPlan.meals.map(meal => ({
        ...meal,
        id: meal.id || uuidv4()
      })),
      createdAt: now,
      updatedAt: now
    }

    try {
      const { resource } = await container.items.create(newMealPlan)
      if (!resource) {
        throw new Error('Failed to create meal plan')
      }
      return resource as MealPlan
    } catch (error: any) {
      throw new Error(`Failed to create meal plan: ${error.message}`)
    }
  }

  /**
   * Get meal plan by ID
   */
  async getMealPlan(mealPlanId: string, userId: string): Promise<MealPlan | null> {
    await this.initialize()
    
    const container = getContainer('mealPlans')
    
    try {
      const { resource } = await container.item(mealPlanId, userId).read<MealPlan>()
      return resource || null
    } catch (error: any) {
      if (error.code === 404) {
        return null
      }
      throw new Error(`Failed to get meal plan: ${error.message}`)
    }
  }

  /**
   * Get all meal plans for a user
   */
  async getUserMealPlans(userId: string, limit: number = 20, offset: number = 0): Promise<MealPlan[]> {
    await this.initialize()
    
    const container = getContainer('mealPlans')
    
    try {
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.userId = @userId 
          ORDER BY c.createdAt DESC 
          OFFSET @offset LIMIT @limit
        `,
        parameters: [
          { name: '@userId', value: userId },
          { name: '@offset', value: offset },
          { name: '@limit', value: limit }
        ]
      }
      
      const { resources } = await container.items.query<MealPlan>(querySpec).fetchAll()
      return resources
    } catch (error: any) {
      throw new Error(`Failed to get user meal plans: ${error.message}`)
    }
  }

  /**
   * Get latest meal plan for a user
   */
  async getLatestMealPlan(userId: string): Promise<MealPlan | null> {
    await this.initialize()
    
    const container = getContainer('mealPlans')
    
    try {
      const querySpec = {
        query: `
          SELECT TOP 1 * FROM c 
          WHERE c.userId = @userId 
          ORDER BY c.createdAt DESC
        `,
        parameters: [
          { name: '@userId', value: userId }
        ]
      }
      
      const { resources } = await container.items.query<MealPlan>(querySpec).fetchAll()
      return resources.length > 0 ? resources[0] : null
    } catch (error: any) {
      throw new Error(`Failed to get latest meal plan: ${error.message}`)
    }
  }

  /**
   * Update meal plan
   */
  async updateMealPlan(mealPlanId: string, userId: string, updates: Partial<MealPlan>): Promise<MealPlan> {
    await this.initialize()
    
    const container = getContainer('mealPlans')
    
    try {
      // First get the existing meal plan
      const existingMealPlan = await this.getMealPlan(mealPlanId, userId)
      if (!existingMealPlan) {
        throw new Error('Meal plan not found')
      }

      // Merge updates
      const updatedMealPlan: MealPlan = {
        ...existingMealPlan,
        ...updates,
        id: mealPlanId, // Ensure ID cannot be changed
        userId, // Ensure userId cannot be changed
        updatedAt: new Date()
      }

      // Ensure meal IDs are set
      if (updatedMealPlan.meals) {
        updatedMealPlan.meals = updatedMealPlan.meals.map(meal => ({
          ...meal,
          id: meal.id || uuidv4()
        }))
      }

      const { resource } = await container.item(mealPlanId, userId).replace(updatedMealPlan)
      if (!resource) {
        throw new Error('Failed to update meal plan')
      }
      return resource as MealPlan
    } catch (error: any) {
      throw new Error(`Failed to update meal plan: ${error.message}`)
    }
  }

  /**
   * Update specific meal in a meal plan
   */
  async updateMeal(mealPlanId: string, userId: string, mealId: string, mealUpdates: Partial<Meal>): Promise<MealPlan> {
    await this.initialize()
    
    try {
      const mealPlan = await this.getMealPlan(mealPlanId, userId)
      if (!mealPlan) {
        throw new Error('Meal plan not found')
      }

      const updatedMeals = mealPlan.meals.map(meal => {
        if (meal.id === mealId) {
          return { ...meal, ...mealUpdates, id: mealId }
        }
        return meal
      })

      return await this.updateMealPlan(mealPlanId, userId, { meals: updatedMeals })
    } catch (error: any) {
      throw new Error(`Failed to update meal: ${error.message}`)
    }
  }

  /**
   * Replace specific meal in a meal plan
   */
  async replaceMeal(mealPlanId: string, userId: string, mealId: string, newMeal: Omit<Meal, 'id'>): Promise<MealPlan> {
    await this.initialize()
    
    try {
      const mealPlan = await this.getMealPlan(mealPlanId, userId)
      if (!mealPlan) {
        throw new Error('Meal plan not found')
      }

      const updatedMeals = mealPlan.meals.map(meal => {
        if (meal.id === mealId) {
          return { ...newMeal, id: mealId }
        }
        return meal
      })

      return await this.updateMealPlan(mealPlanId, userId, { meals: updatedMeals })
    } catch (error: any) {
      throw new Error(`Failed to replace meal: ${error.message}`)
    }
  }

  /**
   * Delete meal plan
   */
  async deleteMealPlan(mealPlanId: string, userId: string): Promise<boolean> {
    await this.initialize()
    
    const container = getContainer('mealPlans')
    
    try {
      await container.item(mealPlanId, userId).delete()
      return true
    } catch (error: any) {
      if (error.code === 404) {
        return false // Already deleted or doesn't exist
      }
      throw new Error(`Failed to delete meal plan: ${error.message}`)
    }
  }

  /**
   * Get meal plans by date range
   */
  async getMealPlansByDateRange(userId: string, startDate: Date, endDate: Date): Promise<MealPlan[]> {
    await this.initialize()
    
    const container = getContainer('mealPlans')
    
    try {
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.userId = @userId 
          AND c.createdAt >= @startDate 
          AND c.createdAt <= @endDate 
          ORDER BY c.createdAt DESC
        `,
        parameters: [
          { name: '@userId', value: userId },
          { name: '@startDate', value: startDate.toISOString() },
          { name: '@endDate', value: endDate.toISOString() }
        ]
      }
      
      const { resources } = await container.items.query<MealPlan>(querySpec).fetchAll()
      return resources
    } catch (error: any) {
      throw new Error(`Failed to get meal plans by date range: ${error.message}`)
    }
  }

  /**
   * Get meal plan count for a user
   */
  async getUserMealPlanCount(userId: string): Promise<number> {
    await this.initialize()
    
    const container = getContainer('mealPlans')
    
    try {
      const querySpec = {
        query: 'SELECT VALUE COUNT(1) FROM c WHERE c.userId = @userId',
        parameters: [
          { name: '@userId', value: userId }
        ]
      }
      
      const { resources } = await container.items.query<number>(querySpec).fetchAll()
      return resources[0] || 0
    } catch (error: any) {
      throw new Error(`Failed to get user meal plan count: ${error.message}`)
    }
  }

  /**
   * Check if meal plan exists and belongs to user
   */
  async mealPlanExists(mealPlanId: string, userId: string): Promise<boolean> {
    const mealPlan = await this.getMealPlan(mealPlanId, userId)
    return mealPlan !== null
  }
}

// Export singleton instance
export const mealPlansDAO = MealPlansDAO.getInstance()