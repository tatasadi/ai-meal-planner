"use client"

import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { OnboardingForm } from "@/components/forms/onboarding-form"
import { useDataSync } from "@/hooks/use-data-sync"
import { useMealPlanStore } from "@/store"
import { LoadingState } from "@/components/ui/loading-state"

export default function OnboardingPage() {
  const router = useRouter()
  const { 
    isLoading: isLoadingData, 
    hasLoadedInitialData, 
    needsOnboarding 
  } = useDataSync()
  
  const { userProfile } = useMealPlanStore()

  const handleComplete = () => {
    // For existing users updating their profile, navigate to dashboard
    // For new users, navigation is handled by the meal generation hook
    const isExistingUser = !needsOnboarding && userProfile
    
    if (isExistingUser) {
      console.log("Profile updated successfully, navigating to dashboard")
      router.push('/dashboard')
    } else {
      console.log("Onboarding completed successfully")
    }
  }

  // Show loading while checking existing data
  if (isLoadingData && !hasLoadedInitialData) {
    return <LoadingState message="Checking your existing data..." />
  }

  // Determine if this is a new user or returning user
  const isExistingUser = !needsOnboarding && userProfile
  
  return (
    <ProtectedRoute>
      <div className="min-h-[calc(100vh-4rem)] gradient-bg flex items-center justify-center p-4">
        <div className="w-full max-w-2xl animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {isExistingUser ? "Update Your Profile" : "Let's Get Started"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {isExistingUser 
                ? "Update your information to keep your meal plans personalized"
                : "Tell us about yourself to create your personalized meal plan"
              }
            </p>
          </div>
          
          <OnboardingForm 
            onComplete={handleComplete} 
            existingProfile={isExistingUser ? userProfile : null}
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}