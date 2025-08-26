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
    <div className="min-h-screen flex items-center justify-center p-4">
      <OnboardingForm onComplete={handleComplete} />
    </div>
  )
}