import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <main className="text-center space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-4">AI Meal Planner</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Create personalized meal plans based on your health data
          </p>
        </div>
        
        <div className="space-y-4">
          <Link href="/onboarding">
            <Button size="lg" className="px-8">
              Get Started
            </Button>
          </Link>
          
          <div className="text-sm text-muted-foreground">
            <p>✨ AI-powered meal suggestions</p>
            <p>🍽️ Personalized to your dietary needs</p>
            <p>📝 Automatic grocery lists</p>
          </div>
        </div>
      </main>
    </div>
  )
}
