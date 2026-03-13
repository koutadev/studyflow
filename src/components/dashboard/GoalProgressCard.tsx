'use client'

import { memo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { Goal } from '@/types/database'

interface GoalProgressCardProps {
  goals: Goal[]
}

const categoryLabels: Record<string, string> = {
  programming: 'プログラミング',
  language: '語学',
  certification: '資格',
  other: 'その他',
}

export const GoalProgressCard = memo(function GoalProgressCard({ goals }: GoalProgressCardProps) {
  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">目標別進捗</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground">まだ目標がありません</p>
            <Link
              href="/goals/new"
              className="mt-2 text-sm text-indigo-600 hover:underline dark:text-indigo-400"
            >
              最初の目標を作成する
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">目標別進捗</CardTitle>
        <Link
          href="/goals"
          className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
        >
          すべて見る
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal) => (
          <Link
            key={goal.id}
            href={`/goals/${goal.id}`}
            className="block rounded-lg p-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: goal.color }}
                />
                <span className="font-medium">{goal.title}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {categoryLabels[goal.category] || goal.category}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={goal.progress_percent} className="flex-1" />
              <span className="text-sm font-medium w-12 text-right">
                {goal.progress_percent}%
              </span>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
})
