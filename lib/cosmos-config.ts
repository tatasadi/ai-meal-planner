/**
 * Cosmos DB configuration validation and utilities
 */

export interface CosmosDBConfig {
  endpoint: string
  key: string
  databaseName: string
}

/**
 * Validate that all required Cosmos DB environment variables are present
 */
export function validateCosmosDBConfig(): CosmosDBConfig {
  const requiredVars = {
    endpoint: process.env.COSMOS_DB_ENDPOINT,
    key: process.env.COSMOS_DB_KEY,
    databaseName: process.env.COSMOS_DB_DATABASE_NAME
  }

  const missingVars = Object.entries(requiredVars)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missingVars.length > 0) {
    throw new Error(`Missing required Cosmos DB environment variables: ${missingVars.join(', ')}`)
  }

  return {
    endpoint: requiredVars.endpoint!,
    key: requiredVars.key!,
    databaseName: requiredVars.databaseName!
  }
}

/**
 * Get Cosmos DB configuration with defaults
 */
export function getCosmosDBConfig(): CosmosDBConfig {
  return {
    endpoint: process.env.COSMOS_DB_ENDPOINT || '',
    key: process.env.COSMOS_DB_KEY || '',
    databaseName: process.env.COSMOS_DB_DATABASE_NAME || 'meal-planner'
  }
}

/**
 * Check if Cosmos DB is configured
 */
export function isCosmosDBConfigured(): boolean {
  try {
    validateCosmosDBConfig()
    return true
  } catch {
    return false
  }
}

/**
 * Container names configuration
 */
export const CONTAINER_NAMES = {
  USER_PROFILES: 'user-profiles',
  MEAL_PLANS: 'meal-plans',
  CHAT_MESSAGES: 'chat-messages',
  GROCERY_LISTS: 'grocery-lists'
} as const

/**
 * Default throughput settings for containers (RU/s)
 */
export const DEFAULT_THROUGHPUT = {
  USER_PROFILES: 400,
  MEAL_PLANS: 400, 
  CHAT_MESSAGES: 400,
  GROCERY_LISTS: 400
} as const