import { getContainer, initializeCosmosDB } from '../cosmos-db'
import { UserProfile } from '../types'
import { v4 as uuidv4 } from 'uuid'

/**
 * Data access layer for User Profiles
 */
export class UserProfilesDAO {
  private static instance: UserProfilesDAO
  
  public static getInstance(): UserProfilesDAO {
    if (!UserProfilesDAO.instance) {
      UserProfilesDAO.instance = new UserProfilesDAO()
    }
    return UserProfilesDAO.instance
  }

  private constructor() {}

  /**
   * Initialize the DAO - ensures Cosmos DB is ready
   */
  async initialize(): Promise<void> {
    await initializeCosmosDB()
  }

  /**
   * Create a new user profile
   */
  async createUserProfile(profile: Omit<UserProfile, 'id'>): Promise<UserProfile> {
    await this.initialize()
    
    const container = getContainer('userProfiles')
    const newProfile: UserProfile = {
      ...profile,
      id: uuidv4()
    }

    try {
      const { resource } = await container.items.create(newProfile)
      if (!resource) {
        throw new Error('Failed to create user profile')
      }
      return resource as UserProfile
    } catch (error: any) {
      if (error.code === 409) {
        throw new Error('User profile already exists with this email')
      }
      throw new Error(`Failed to create user profile: ${error.message}`)
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    await this.initialize()
    
    const container = getContainer('userProfiles')
    
    try {
      const { resource } = await container.item(userId, userId).read<UserProfile>()
      return resource || null
    } catch (error: any) {
      if (error.code === 404) {
        return null
      }
      throw new Error(`Failed to get user profile: ${error.message}`)
    }
  }

  /**
   * Get user profile by email
   */
  async getUserProfileByEmail(email: string): Promise<UserProfile | null> {
    await this.initialize()
    
    const container = getContainer('userProfiles')
    
    try {
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [
          { name: '@email', value: email }
        ]
      }
      
      const { resources } = await container.items.query<UserProfile>(querySpec).fetchAll()
      return resources.length > 0 ? resources[0] : null
    } catch (error: any) {
      throw new Error(`Failed to get user profile by email: ${error.message}`)
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    await this.initialize()
    
    const container = getContainer('userProfiles')
    
    try {
      // First get the existing profile
      const existingProfile = await this.getUserProfile(userId)
      if (!existingProfile) {
        throw new Error('User profile not found')
      }

      // Merge updates
      const updatedProfile: UserProfile = {
        ...existingProfile,
        ...updates,
        id: userId // Ensure ID cannot be changed
      }

      const { resource } = await container.item(userId, userId).replace(updatedProfile)
      if (!resource) {
        throw new Error('Failed to update user profile')
      }
      return resource as UserProfile
    } catch (error: any) {
      throw new Error(`Failed to update user profile: ${error.message}`)
    }
  }

  /**
   * Delete user profile
   */
  async deleteUserProfile(userId: string): Promise<boolean> {
    await this.initialize()
    
    const container = getContainer('userProfiles')
    
    try {
      await container.item(userId, userId).delete()
      return true
    } catch (error: any) {
      if (error.code === 404) {
        return false // Already deleted or doesn't exist
      }
      throw new Error(`Failed to delete user profile: ${error.message}`)
    }
  }

  /**
   * Check if user profile exists
   */
  async userProfileExists(userId: string): Promise<boolean> {
    const profile = await this.getUserProfile(userId)
    return profile !== null
  }

  /**
   * Check if email is already registered
   */
  async emailExists(email: string): Promise<boolean> {
    const profile = await this.getUserProfileByEmail(email)
    return profile !== null
  }

  /**
   * Get user profiles count (for admin/analytics)
   */
  async getUserProfilesCount(): Promise<number> {
    await this.initialize()
    
    const container = getContainer('userProfiles')
    
    try {
      const querySpec = {
        query: 'SELECT VALUE COUNT(1) FROM c'
      }
      
      const { resources } = await container.items.query<number>(querySpec).fetchAll()
      return resources[0] || 0
    } catch (error: any) {
      throw new Error(`Failed to get user profiles count: ${error.message}`)
    }
  }
}

// Export singleton instance
export const userProfilesDAO = UserProfilesDAO.getInstance()