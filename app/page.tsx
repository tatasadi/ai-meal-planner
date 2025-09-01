import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { AuthButton } from "@/components/auth/auth-button"
import { Sparkles, ShoppingCart, Zap, Heart } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)] gradient-bg">
      <div className="container mx-auto px-4 h-full flex flex-col">
        <main className="text-center max-w-6xl mx-auto flex-1 flex flex-col justify-center py-8">
          {/* Hero Section */}
          <div className="space-y-6 lg:space-y-8">
            <div className="space-y-4 lg:space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                AI-Powered Nutrition
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent leading-[1.1]">
                Your Personal
                <br />
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Meal Planner
                </span>
              </h1>

              <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Transform your health journey with AI-powered meal plans
                tailored to your unique dietary needs, preferences, and goals.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <AuthButton
                redirectTo="/onboarding"
                className="px-8 h-12 text-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Zap className="w-5 h-5 mr-2" />
                Start Planning
              </AuthButton>

              <Button variant="outline" size="lg" className="px-8 h-12 text-lg">
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Features Grid - Compact */}
          <div className="grid md:grid-cols-3 gap-4 lg:gap-6 mt-8 lg:mt-12">
            <Card className="p-4 lg:p-6 text-left card-elevated border-0 shadow-lg">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
              </div>
              <h3 className="text-lg lg:text-xl font-semibold mb-2 text-foreground">
                AI-Powered Suggestions
              </h3>
              <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
                Advanced AI analyzes your health data and preferences to create
                perfectly balanced meal plans.
              </p>
            </Card>

            <Card className="p-4 lg:p-6 text-left card-elevated border-0 shadow-lg">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-chart-2/20 to-chart-2/10 flex items-center justify-center mb-4 border border-chart-2/20">
                <Heart className="w-5 h-5 lg:w-6 lg:h-6 text-chart-2" />
              </div>
              <h3 className="text-lg lg:text-xl font-semibold mb-2 text-foreground">
                Personalized Nutrition
              </h3>
              <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
                Every meal is tailored to your dietary restrictions, allergies,
                and health goals.
              </p>
            </Card>

            <Card className="p-4 lg:p-6 text-left card-elevated border-0 shadow-lg">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-chart-1/20 to-chart-1/10 flex items-center justify-center mb-4 border border-chart-1/20">
                <ShoppingCart className="w-5 h-5 lg:w-6 lg:h-6 text-chart-1" />
              </div>
              <h3 className="text-lg lg:text-xl font-semibold mb-2 text-foreground">
                Smart Grocery Lists
              </h3>
              <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
                Automatically generated shopping lists save time and reduce food
                waste.
              </p>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
