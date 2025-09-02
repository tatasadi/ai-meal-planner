import { getContainer, initializeCosmosDB } from '../cosmos-db'
import { ChatMessage } from '../types'
import { v4 as uuidv4 } from 'uuid'

/**
 * Data access layer for Chat Messages
 */
export class ChatMessagesDAO {
  private static instance: ChatMessagesDAO
  
  public static getInstance(): ChatMessagesDAO {
    if (!ChatMessagesDAO.instance) {
      ChatMessagesDAO.instance = new ChatMessagesDAO()
    }
    return ChatMessagesDAO.instance
  }

  private constructor() {}

  /**
   * Initialize the DAO - ensures Cosmos DB is ready
   */
  async initialize(): Promise<void> {
    await initializeCosmosDB()
  }

  /**
   * Create a new chat message
   */
  async createChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    await this.initialize()
    
    const container = getContainer('chatMessages')
    const newMessage: ChatMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date()
    }

    try {
      const { resource } = await container.items.create(newMessage)
      if (!resource) {
        throw new Error('Failed to create chat message')
      }
      return resource as ChatMessage
    } catch (error: any) {
      throw new Error(`Failed to create chat message: ${error.message}`)
    }
  }

  /**
   * Get chat message by ID
   */
  async getChatMessage(messageId: string, userId: string): Promise<ChatMessage | null> {
    await this.initialize()
    
    const container = getContainer('chatMessages')
    
    try {
      const { resource } = await container.item(messageId, userId).read<ChatMessage>()
      return resource || null
    } catch (error: any) {
      if (error.code === 404) {
        return null
      }
      throw new Error(`Failed to get chat message: ${error.message}`)
    }
  }

  /**
   * Get all chat messages for a meal plan
   */
  async getMealPlanChatMessages(mealPlanId: string, userId: string, limit: number = 50): Promise<ChatMessage[]> {
    await this.initialize()
    
    const container = getContainer('chatMessages')
    
    try {
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.userId = @userId 
          AND c.mealPlanId = @mealPlanId 
          ORDER BY c.timestamp ASC
        `,
        parameters: [
          { name: '@userId', value: userId },
          { name: '@mealPlanId', value: mealPlanId }
        ]
      }
      
      const { resources } = await container.items
        .query<ChatMessage>(querySpec, { maxItemCount: limit })
        .fetchAll()
      return resources
    } catch (error: any) {
      throw new Error(`Failed to get meal plan chat messages: ${error.message}`)
    }
  }

  /**
   * Get all chat messages for a user
   */
  async getUserChatMessages(userId: string, limit: number = 100, offset: number = 0): Promise<ChatMessage[]> {
    await this.initialize()
    
    const container = getContainer('chatMessages')
    
    try {
      const querySpec = {
        query: `
          SELECT * FROM c 
          WHERE c.userId = @userId 
          ORDER BY c.timestamp DESC 
          OFFSET @offset LIMIT @limit
        `,
        parameters: [
          { name: '@userId', value: userId },
          { name: '@offset', value: offset },
          { name: '@limit', value: limit }
        ]
      }
      
      const { resources } = await container.items.query<ChatMessage>(querySpec).fetchAll()
      return resources
    } catch (error: any) {
      throw new Error(`Failed to get user chat messages: ${error.message}`)
    }
  }

  /**
   * Get recent chat messages for a meal plan (conversation context)
   */
  async getRecentMealPlanChatMessages(mealPlanId: string, userId: string, limit: number = 10): Promise<ChatMessage[]> {
    await this.initialize()
    
    const container = getContainer('chatMessages')
    
    try {
      const querySpec = {
        query: `
          SELECT TOP @limit * FROM c 
          WHERE c.userId = @userId 
          AND c.mealPlanId = @mealPlanId 
          ORDER BY c.timestamp DESC
        `,
        parameters: [
          { name: '@userId', value: userId },
          { name: '@mealPlanId', value: mealPlanId },
          { name: '@limit', value: limit }
        ]
      }
      
      const { resources } = await container.items.query<ChatMessage>(querySpec).fetchAll()
      // Reverse to get chronological order (oldest first)
      return resources.reverse()
    } catch (error: any) {
      throw new Error(`Failed to get recent meal plan chat messages: ${error.message}`)
    }
  }

  /**
   * Update chat message
   */
  async updateChatMessage(messageId: string, userId: string, updates: Partial<ChatMessage>): Promise<ChatMessage> {
    await this.initialize()
    
    const container = getContainer('chatMessages')
    
    try {
      // First get the existing message
      const existingMessage = await this.getChatMessage(messageId, userId)
      if (!existingMessage) {
        throw new Error('Chat message not found')
      }

      // Merge updates (prevent changing core fields)
      const updatedMessage: ChatMessage = {
        ...existingMessage,
        ...updates,
        id: messageId, // Ensure ID cannot be changed
        userId, // Ensure userId cannot be changed
        timestamp: existingMessage.timestamp // Preserve original timestamp
      }

      const { resource } = await container.item(messageId, userId).replace(updatedMessage)
      if (!resource) {
        throw new Error('Failed to update chat message')
      }
      return resource as ChatMessage
    } catch (error: any) {
      throw new Error(`Failed to update chat message: ${error.message}`)
    }
  }

  /**
   * Delete chat message
   */
  async deleteChatMessage(messageId: string, userId: string): Promise<boolean> {
    await this.initialize()
    
    const container = getContainer('chatMessages')
    
    try {
      await container.item(messageId, userId).delete()
      return true
    } catch (error: any) {
      if (error.code === 404) {
        return false // Already deleted or doesn't exist
      }
      throw new Error(`Failed to delete chat message: ${error.message}`)
    }
  }

  /**
   * Delete all chat messages for a meal plan
   */
  async deleteMealPlanChatMessages(mealPlanId: string, userId: string): Promise<number> {
    await this.initialize()
    
    try {
      const messages = await this.getMealPlanChatMessages(mealPlanId, userId)
      let deletedCount = 0

      for (const message of messages) {
        const deleted = await this.deleteChatMessage(message.id, userId)
        if (deleted) deletedCount++
      }

      return deletedCount
    } catch (error: any) {
      throw new Error(`Failed to delete meal plan chat messages: ${error.message}`)
    }
  }

  /**
   * Delete all chat messages for a user
   */
  async deleteUserChatMessages(userId: string): Promise<number> {
    await this.initialize()
    
    const container = getContainer('chatMessages')
    let deletedCount = 0

    try {
      const querySpec = {
        query: 'SELECT c.id FROM c WHERE c.userId = @userId',
        parameters: [
          { name: '@userId', value: userId }
        ]
      }

      const { resources } = await container.items.query<{ id: string }>(querySpec).fetchAll()

      for (const item of resources) {
        try {
          await container.item(item.id, userId).delete()
          deletedCount++
        } catch {
          // Continue with other deletions even if one fails
        }
      }

      return deletedCount
    } catch (error: any) {
      throw new Error(`Failed to delete user chat messages: ${error.message}`)
    }
  }

  /**
   * Get chat messages by date range
   */
  async getChatMessagesByDateRange(userId: string, startDate: Date, endDate: Date, mealPlanId?: string): Promise<ChatMessage[]> {
    await this.initialize()
    
    const container = getContainer('chatMessages')
    
    try {
      let query = `
        SELECT * FROM c 
        WHERE c.userId = @userId 
        AND c.timestamp >= @startDate 
        AND c.timestamp <= @endDate
      `
      
      const parameters: any[] = [
        { name: '@userId', value: userId },
        { name: '@startDate', value: startDate.toISOString() },
        { name: '@endDate', value: endDate.toISOString() }
      ]

      if (mealPlanId) {
        query += ' AND c.mealPlanId = @mealPlanId'
        parameters.push({ name: '@mealPlanId', value: mealPlanId })
      }

      query += ' ORDER BY c.timestamp ASC'

      const querySpec = { query, parameters }
      
      const { resources } = await container.items.query<ChatMessage>(querySpec).fetchAll()
      return resources
    } catch (error: any) {
      throw new Error(`Failed to get chat messages by date range: ${error.message}`)
    }
  }

  /**
   * Get chat message count for a meal plan
   */
  async getMealPlanChatMessageCount(mealPlanId: string, userId: string): Promise<number> {
    await this.initialize()
    
    const container = getContainer('chatMessages')
    
    try {
      const querySpec = {
        query: `
          SELECT VALUE COUNT(1) FROM c 
          WHERE c.userId = @userId 
          AND c.mealPlanId = @mealPlanId
        `,
        parameters: [
          { name: '@userId', value: userId },
          { name: '@mealPlanId', value: mealPlanId }
        ]
      }
      
      const { resources } = await container.items.query<number>(querySpec).fetchAll()
      return resources[0] || 0
    } catch (error: any) {
      throw new Error(`Failed to get meal plan chat message count: ${error.message}`)
    }
  }

  /**
   * Get user's total chat message count
   */
  async getUserChatMessageCount(userId: string): Promise<number> {
    await this.initialize()
    
    const container = getContainer('chatMessages')
    
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
      throw new Error(`Failed to get user chat message count: ${error.message}`)
    }
  }
}

// Export singleton instance
export const chatMessagesDAO = ChatMessagesDAO.getInstance()