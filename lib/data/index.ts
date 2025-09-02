// Data Access Objects exports
export { userProfilesDAO, UserProfilesDAO } from './user-profiles'
export { mealPlansDAO, MealPlansDAO } from './meal-plans'
export { chatMessagesDAO, ChatMessagesDAO } from './chat-messages'

// Cosmos DB utilities
export { 
  initializeCosmosDB, 
  getCosmosClient, 
  getDatabase, 
  getContainer, 
  checkCosmosDBHealth,
  disposeCosmosDB 
} from '../cosmos-db'