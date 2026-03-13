'use client'

import { useState } from 'react'
import { Trash2, Timer, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { deleteStudyLog } from '@/app/(dashboard)/log/actions'
import type { StudyLog, Goal } from '@/types/database'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { toast } from 'sonner'

interface LogHistoryProps {
  logs: (StudyLog & { goals: Goal | null })[]
  goals?: Goal[]
  onDelete?: (id: string) => void
}

const moodEmojis: Record<string, string> = {
  great: '🔥',
  good: '😊',
  neutral: '😐',
  difficult: '😓',
}

export function LogHistory({ logs, goals = [], onDelete }: LogHistoryProps) {
  const [filterGoalId, setFilterGoalId] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [showFilter, setShowFilter] = useState(false)

  const handleDelete = async (id: string) => {
    if (!confirm('この記録を削除しますか？')) return

    const result = await deleteStudyLog(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('記録を削除しました')
      onDelete?.(id)
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}分`
    if (mins === 0) return `${hours}時間`
    return `${hours}時間${mins}分`
  }

  const isPomodoroLog = (log: StudyLog) => {
    return log.note?.includes('ポモドーロ')
  }

  // フィルター適用
  const filteredLogs = logs.filter((log) => {
    if (filterGoalId !== 'all' && log.goal_id !== filterGoalId) return false
    if (filterDateFrom && log.study_date < filterDateFrom) return false
    if (filterDateTo && log.study_date > filterDateTo) return false
    return true
  })

  const hasActiveFilter = filterGoalId !== 'all' || filterDateFrom || filterDateTo

  const clearFilters = () => {
    setFilterGoalId('all')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  // フィルターで使う目標リスト
  const uniqueGoals = goals.length > 0
    ? goals
    : [...new Map(logs.filter((l) => l.goals).map((l) => [l.goals!.id, l.goals!])).values()]

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>学習履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            まだ学習記録がありません
          </p>
        </CardContent>
      </Card>
    )
  }

  // 日付でグループ化
  const groupedLogs = filteredLogs.reduce((groups, log) => {
    const date = log.study_date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(log)
    return groups
  }, {} as Record<string, typeof filteredLogs>)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>学習履歴</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilter(!showFilter)}
            className={hasActiveFilter ? 'text-indigo-600' : ''}
          >
            <Filter className="h-4 w-4 mr-1" />
            フィルター
            {hasActiveFilter && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                ON
              </Badge>
            )}
          </Button>
        </div>

        {/* フィルターパネル */}
        {showFilter && (
          <div className="mt-3 p-3 border rounded-lg bg-zinc-50 dark:bg-zinc-800 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">目標</Label>
              <Select value={filterGoalId} onValueChange={setFilterGoalId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  {uniqueGoals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">開始日</Label>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">終了日</Label>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full text-xs">
                フィルターをクリア
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {filteredLogs.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            条件に一致する記録がありません
          </p>
        ) : (
          Object.entries(groupedLogs).map(([date, dateLogs]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {format(new Date(date), 'yyyy年MM月dd日（E）', { locale: ja })}
              </h3>
              <div className="space-y-3">
                {dateLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 rounded-lg border p-4"
                  >
                    {log.goals && (
                      <div
                        className="mt-1 h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: log.goals.color }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {log.goals?.title || '削除された目標'}
                        </span>
                        {log.mood && (
                          <span className="text-lg">{moodEmojis[log.mood]}</span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">
                          {formatDuration(log.duration_minutes)}
                        </Badge>
                        {isPomodoroLog(log) && (
                          <Badge variant="outline" className="text-indigo-600 border-indigo-300 dark:text-indigo-400 dark:border-indigo-700">
                            <Timer className="h-3 w-3 mr-1" />
                            タイマー
                          </Badge>
                        )}
                      </div>
                      {log.note && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {log.note}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-600"
                      onClick={() => handleDelete(log.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
