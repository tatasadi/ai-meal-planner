import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/src/components/ui/skeleton"

export function MealCardSkeleton() {
  return (
    <Card className="bg-muted/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>

        <div>
          <Skeleton className="h-4 w-20 mb-2" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/6" />
            <Skeleton className="h-3 w-3/6" />
          </div>
        </div>

        <Skeleton className="h-8 w-full rounded-md" />
      </CardContent>
    </Card>
  )
}