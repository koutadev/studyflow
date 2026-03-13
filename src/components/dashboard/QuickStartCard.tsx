import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Timer, ArrowRight } from 'lucide-react'
import type { Goal } from '@/types/database'

interface QuickStartCardProps {
  goals: Goal[]
  recentGoals: Goal[]
}

export function QuickStartCard({ goals, recentGoals }: QuickStartCardProps) {
  if (goals.length === 0) return null

  const displayGoals = recentGoals.length > 0 ? recentGoals : goals.slice(0, 3)

  return (
    <Card className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50">
      <CardContent className="py-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
              <Timer className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-white">学習を始める</h2>
              <p className="text-sm text-muted-foreground">タイマーで集中して学習しましょう</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {displayGoals.map((goal) => (
              <Button
                key={goal.id}
                variant="outline"
                size="sm"
                asChild
                className="bg-white dark:bg-zinc-900"
              >
                <Link href={`/timer?goal=${goal.id}`}>
                  <div
                    className="h-2.5 w-2.5 rounded-full mr-2"
                    style={{ backgroundColor: goal.color }}
                  />
                  {goal.title}
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
