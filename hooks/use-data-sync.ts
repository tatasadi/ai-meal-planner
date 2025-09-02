'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from './use-auth'
import { useAuthFetch } from './use-auth-fetch'
import { useMealPlanStore } from '@/store'
import { logger } from '@/lib/error-handling'
import type { UserProfile, MealPlan, GroceryList } from '@/lib/types'

interface DataSyncState {
  isLoadingProfile: boolean
  isLoadingMealPlans: boolean
  isLoadingGroceryLists: boolean
  hasLoadedInitialData: boolean
  error: string | null
}

/**
 * Hook to sync user data from database to Zustand store
 * Loads user profile, meal plans, and grocery lists on authentication
 */
export function useDataSync() {
  const { user, isAuthenticated } = useAuth()
  const { authFetch } = useAuthFetch()
  const { 
    setUserProfile, 
    setCurrentMealPlan, 
    userProfile, 
    currentMealPlan,
    hasHydrated 
  } = useMealPlanStore()

  const [syncState, setSyncState] = useState<DataSyncState>({
    isLoadingProfile: false,
    isLoadingMealPlans: false,
    isLoadingGroceryLists: false,
    hasLoadedInitialData: false,
    error: null
  })

  // Use ref to track sync state to avoid dependency issues
  const syncedUserIdRef = useRef<string | null>(null)

  /**
   * Load user profile from database
   */
  const loadUserProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!isAuthenticated || !user) return null

    setSyncState(prev => ({ ...prev, isLoadingProfile: true, error: null }))

    try {
      logger.info('Loading user profile from database', { userId: user.id })
      
      const response = await authFetch('/api/user/profile')
      const profileData = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          logger.info('User profile not found in database', { userId: user.id })
          return null // Profile doesn't exist yet
        }
        throw new Error(profileData.error || 'Failed to load user profile')
      }

      logger.info('User profile loaded successfully', { userId: user.id })
      return profileData as UserProfile
    } catch (error: any) {
      logger.error(error instanceof Error ? error : new Error('Failed to load user profile'), { userId: user.id })
      setSyncState(prev => ({ ...prev, error: `Failed to load profile: ${error.message}` }))
      return null
    } finally {
      setSyncState(prev => ({ ...prev, isLoadingProfile: false }))
    }
  }, [isAuthenticated, user, authFetch])

  /**
   * Load recent meal plans from database
   */
  const loadRecentMealPlans = useCallback(async (): Promise<MealPlan[]> => {
    if (!isAuthenticated || !user) return []

    setSyncState(prev => ({ ...prev, isLoadingMealPlans: true }))

    try {
      logger.info('Loading meal plans from database', { userId: user.id })
      
      const response = await authFetch('/api/meal-plans?limit=5') // Load recent 5 meal plans
      
      if (!response.ok) {
        if (response.status === 404) {
          logger.info('No meal plans found in database', { userId: user.id })
          return []
        }
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load meal plans')
      }

      const mealPlans = await response.json() as MealPlan[]
      logger.info('Meal plans loaded successfully', { 
        userId: user.id, 
        count: mealPlans.length 
      })
      
      return mealPlans
    } catch (error: any) {
      logger.error(error instanceof Error ? error : new Error('Failed to load meal plans'), { userId: user.id })
      // Don't set error for meal plans - not critical for app functionality
      return []
    } finally {
      setSyncState(prev => ({ ...prev, isLoadingMealPlans: false }))
    }
  }, [isAuthenticated, user, authFetch])

  /**
   * Load grocery lists from database
   */
  const loadGroceryLists = useCallback(async (): Promise<GroceryList[]> => {
    if (!isAuthenticated || !user) return []

    setSyncState(prev => ({ ...prev, isLoadingGroceryLists: true }))

    try {
      logger.info('Loading grocery lists from database', { userId: user.id })
      
      const response = await authFetch('/api/grocery-lists?limit=10')
      
      if (!response.ok) {
        if (response.status === 404) {
          logger.info('No grocery lists found in database', { userId: user.id })
          return []
        }
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load grocery lists')
      }

      const groceryLists = await response.json() as GroceryList[]
      logger.info('Grocery lists loaded successfully', { 
        userId: user.id, 
        count: groceryLists.length 
      })
      
      return groceryLists
    } catch (error: any) {
      logger.error(error instanceof Error ? error : new Error('Failed to load grocery lists'), { userId: user.id })
      // Don't set error for grocery lists - not critical for app functionality
      return []
    } finally {
      setSyncState(prev => ({ ...prev, isLoadingGroceryLists: false }))
    }
  }, [isAuthenticated, user, authFetch])

  /**
   * Sync all user data from database to store
   */
  const syncAllData = useCallback(async () => {
    if (!isAuthenticated || !user) return

    logger.info('Starting data sync from database', { userId: user.id })

    try {
      // Load user profile
      const profile = await loadUserProfile()
      if (profile) {
        setUserProfile(profile)
        logger.info('User profile synced to store', { userId: user.id })
      }

      // Load meal plans
      const mealPlans = await loadRecentMealPlans()
      if (mealPlans.length > 0) {
        // Set the most recent meal plan as current
        setCurrentMealPlan(mealPlans[0])
        logger.info('Most recent meal plan synced to store', { 
          userId: user.id, 
          mealPlanId: mealPlans[0].id 
        })
      }

      // Load grocery lists (for future use)
      await loadGroceryLists()

      setSyncState(prev => ({ ...prev, hasLoadedInitialData: true }))
      logger.info('Data sync completed successfully', { userId: user.id })

    } catch (error: any) {
      logger.error(error instanceof Error ? error : new Error('Data sync failed'), { userId: user.id })
      setSyncState(prev => ({ ...prev, error: `Sync failed: ${error.message}` }))
    }
  }, [
    isAuthenticated, 
    user, 
    loadUserProfile,
    loadRecentMealPlans, 
    loadGroceryLists,
    setUserProfile,
    setCurrentMealPlan
  ])

  /**
   * Effect to trigger data sync when user authenticates
   */
  useEffect(() => {
    // Only sync if:
    // 1. User is authenticated
    // 2. Store has rehydrated from localStorage 
    // 3. We haven't synced for this user yet
    if (
      isAuthenticated && 
      user && 
      hasHydrated && 
      syncedUserIdRef.current !== user.id
    ) {
      syncedUserIdRef.current = user.id
      syncAllData()
    }
  }, [isAuthenticated, user?.id, hasHydrated, syncAllData])

  /**
   * Manual refresh function
   */
  const refreshData = useCallback(async () => {
    setSyncState(prev => ({ ...prev, hasLoadedInitialData: false }))
    // Reset the sync tracking to allow re-sync
    syncedUserIdRef.current = null
    await syncAllData()
  }, [syncAllData])

  return {
    // Loading states
    isLoadingProfile: syncState.isLoadingProfile,
    isLoadingMealPlans: syncState.isLoadingMealPlans,
    isLoadingGroceryLists: syncState.isLoadingGroceryLists,
    isLoading: syncState.isLoadingProfile || syncState.isLoadingMealPlans || syncState.isLoadingGroceryLists,
    hasLoadedInitialData: syncState.hasLoadedInitialData,
    
    // Error state
    error: syncState.error,
    
    // Actions
    refreshData,
    loadUserProfile,
    loadRecentMealPlans,
    loadGroceryLists,
    
    // Computed state
    needsOnboarding: hasHydrated && syncState.hasLoadedInitialData && !userProfile,
    hasMealPlan: !!currentMealPlan
  }
}