import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sparkles, ShoppingCart, Zap, Heart } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen gradient-bg">
      <div className="container mx-auto px-4 py-16">
        <main className="text-center space-y-16 max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="space-y-8 animate-in">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                AI-Powered Nutrition
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent leading-[1.1]">
                Your Personal
                <br />
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Meal Planner
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Transform your health journey with AI-powered meal plans tailored to your unique dietary needs, preferences, and goals.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/onboarding">
                <Button size="lg" className="px-8 h-12 text-lg shadow-lg hover:shadow-xl transition-all duration-200">
                  <Zap className="w-5 h-5 mr-2" />
                  Start Planning
                </Button>
              </Link>
              
              <Button variant="outline" size="lg" className="px-8 h-12 text-lg">
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-20 animate-slide-up">
            <Card className="p-8 text-left card-hover card-elevated border-0 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">AI-Powered Suggestions</h3>
              <p className="text-muted-foreground leading-relaxed">
                Advanced AI analyzes your health data and preferences to create perfectly balanced meal plans.
              </p>
            </Card>

            <Card className="p-8 text-left card-hover card-elevated border-0 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-chart-2/20 to-chart-2/10 flex items-center justify-center mb-6 border border-chart-2/20">
                <Heart className="w-6 h-6 text-chart-2" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Personalized Nutrition</h3>
              <p className="text-muted-foreground leading-relaxed">
                Every meal is tailored to your dietary restrictions, allergies, and health goals.
              </p>
            </Card>

            <Card className="p-8 text-left card-hover card-elevated border-0 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-chart-1/20 to-chart-1/10 flex items-center justify-center mb-6 border border-chart-1/20">
                <ShoppingCart className="w-6 h-6 text-chart-1" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground">Smart Grocery Lists</h3>
              <p className="text-muted-foreground leading-relaxed">
                Automatically generated shopping lists save time and reduce food waste.
              </p>
            </Card>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-16 border-t border-border/50">
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-primary">10k+</div>
              <div className="text-sm text-muted-foreground">Meal Plans Created</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-primary">98%</div>
              <div className="text-sm text-muted-foreground">User Satisfaction</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-primary">2M+</div>
              <div className="text-sm text-muted-foreground">Meals Planned</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-primary">15min</div>
              <div className="text-sm text-muted-foreground">Average Setup Time</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
