'use client'

import { memo } from 'react'
import { Clock, Target, Flame, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface SummaryCardsProps {
  todayMinutes: number
  weeklyMinutes: number
  weeklyGoalMinutes: number
  totalHours: number
  streak: number
}

export const SummaryCards = memo(function SummaryCards({
  todayMinutes,
  weeklyMinutes,
  weeklyGoalMinutes,
  totalHours,
  streak,
}: SummaryCardsProps) {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}分`
    if (mins === 0) return `${hours}時間`
    return `${hours}時間${mins}分`
  }

  const weeklyProgress = weeklyGoalMinutes > 0
    ? Math.min(100, Math.round((weeklyMinutes / weeklyGoalMinutes) * 100))
    : 0

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950">
              <Clock className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">今日の学習</p>
              <p className="text-2xl font-bold">{formatTime(todayMinutes)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">週間目標</p>
              <p className="text-2xl font-bold">
                {formatTime(weeklyMinutes)}
                <span className="text-sm font-normal text-muted-foreground">
                  {' '}/ {formatTime(weeklyGoalMinutes)}
                </span>
              </p>
              <div className="mt-1 h-1.5 w-24 rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-1.5 rounded-full bg-green-600"
                  style={{ width: `${weeklyProgress}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950">
              <Flame className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">連続学習</p>
              <p className="text-2xl font-bold">{streak}日</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">総学習時間</p>
              <p className="text-2xl font-bold">{totalHours}時間</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})
