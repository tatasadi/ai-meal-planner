import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({ message = "Loading...", className = "" }: LoadingStateProps) {
  return (
    <div className={`min-h-screen gradient-bg flex items-center justify-center ${className}`}>
      <Card className="card-elevated border-0 shadow-xl">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">{message}</p>
        </CardContent>
      </Card>
    </div>
  )
}

export function InlineLoadingState({ message = "Loading...", size = "md" }: LoadingStateProps & { size?: "sm" | "md" | "lg" }) {
  const sizeConfig = {
    sm: { loader: "w-4 h-4", text: "text-sm", spacing: "mb-2" },
    md: { loader: "w-6 h-6", text: "text-base", spacing: "mb-3" },
    lg: { loader: "w-8 h-8", text: "text-lg", spacing: "mb-4" },
  }
  
  const config = sizeConfig[size]
  
  return (
    <div className="text-center py-8">
      <Loader2 className={`${config.loader} animate-spin mx-auto ${config.spacing} text-primary`} />
      <p className={`${config.text} text-muted-foreground`}>{message}</p>
    </div>
  )
}