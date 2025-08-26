"use client"

import { OnboardingForm } from "@/src/components/forms/onboarding-form"
import { useRouter } from "next/navigation"

export default function OnboardingPage() {
  const router = useRouter()

  const handleComplete = (data: any) => {
    console.log("Onboarding data:", data)
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Let's Get Started
          </h1>
          <p className="text-lg text-muted-foreground">
            Tell us about yourself to create your personalized meal plan
          </p>
        </div>
        
        <div className="glass-effect rounded-2xl p-8 shadow-xl border-0">
          <OnboardingForm onComplete={handleComplete} />
        </div>
      </div>
    </div>
  )
}