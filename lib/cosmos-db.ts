import { CosmosClient, Database, Container } from '@azure/cosmos'
import { validateCosmosDBConfig, CONTAINER_NAMES } from './cosmos-config'

// Cosmos DB configuration
const getConfig = () => {
  const { endpoint, key, databaseName } = validateCosmosDBConfig()
  return {
    endpoint,
    key,
    databaseId: databaseName,
    containers: {
      userProfiles: CONTAINER_NAMES.USER_PROFILES,
      mealPlans: CONTAINER_NAMES.MEAL_PLANS, 
      chatMessages: CONTAINER_NAMES.CHAT_MESSAGES,
      groceryLists: CONTAINER_NAMES.GROCERY_LISTS
    }
  }
}

// Global client instance
let client: CosmosClient | null = null
let database: Database | null = null
let containers: Record<string, Container> = {}

/**
 * Initialize Cosmos DB client and database connection
 */
export async function initializeCosmosDB(): Promise<void> {
  if (client && database) {
    return // Already initialized
  }

  try {
    const config = getConfig()
    
    // Create client
    client = new CosmosClient({ endpoint: config.endpoint, key: config.key })

    // Create database if it doesn't exist
    const { database: db } = await client.databases.createIfNotExists({
      id: config.databaseId
    })
    database = db

    // Create containers if they don't exist
    for (const [key, containerId] of Object.entries(config.containers)) {
      const containerConfig = getContainerConfig(containerId)
      const { container } = await database.containers.createIfNotExists(containerConfig)
      containers[key] = container
    }

    console.log('✅ Cosmos DB initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize Cosmos DB:', error)
    throw error
  }
}

/**
 * Get container configuration with appropriate partitioning
 */
function getContainerConfig(containerId: string) {
  const baseConfig = {
    id: containerId,
    indexingPolicy: {
      includedPaths: [{ path: '/*' }],
      excludedPaths: [{ path: '/metadata/*' }]
    }
  }

  switch (containerId) {
    case 'user-profiles':
      return {
        ...baseConfig,
        partitionKey: { paths: ['/id'] },
        uniqueKeyPolicy: {
          uniqueKeys: [{ paths: ['/email'] }]
        }
      }
    case 'meal-plans':
      return {
        ...baseConfig,
        partitionKey: { paths: ['/userId'] },
        indexingPolicy: {
          includedPaths: [
            { path: '/*' },
            { path: '/createdAt/?' },
            { path: '/updatedAt/?' }
          ],
          excludedPaths: [{ path: '/meals/*/ingredients/*' }]
        }
      }
    case 'chat-messages':
      return {
        ...baseConfig,
        partitionKey: { paths: ['/userId'] },
        indexingPolicy: {
          includedPaths: [
            { path: '/*' },
            { path: '/mealPlanId/?' },
            { path: '/timestamp/?' }
          ],
          excludedPaths: [{ path: '/content/*' }, { path: '/metadata/*' }]
        }
      }
    case 'grocery-lists':
      return {
        ...baseConfig,
        partitionKey: { paths: ['/userId'] },
        indexingPolicy: {
          includedPaths: [
            { path: '/*' },
            { path: '/mealPlanId/?' },
            { path: '/createdAt/?' }
          ],
          excludedPaths: [{ path: '/items/*' }]
        }
      }
    default:
      return {
        ...baseConfig,
        partitionKey: { paths: ['/id'] }
      }
  }
}

/**
 * Get Cosmos DB client instance
 */
export function getCosmosClient(): CosmosClient {
  if (!client) {
    throw new Error('Cosmos DB client not initialized. Call initializeCosmosDB() first.')
  }
  return client
}

/**
 * Get Cosmos DB database instance
 */
export function getDatabase(): Database {
  if (!database) {
    throw new Error('Cosmos DB database not initialized. Call initializeCosmosDB() first.')
  }
  return database
}

/**
 * Get specific container instance
 */
export function getContainer(containerName: string): Container {
  if (!containers[containerName]) {
    throw new Error(`Container ${containerName} not initialized. Call initializeCosmosDB() first.`)
  }
  return containers[containerName]
}

/**
 * Health check for Cosmos DB connection
 */
export async function checkCosmosDBHealth(): Promise<boolean> {
  try {
    if (!database) {
      return false
    }
    
    // Simple read operation to test connection
    await database.read()
    return true
  } catch {
    return false
  }
}

/**
 * Clean up Cosmos DB connections
 */
export function disposeCosmosDB(): void {
  if (client) {
    client.dispose()
    client = null
    database = null
    containers = {}
  }
}