'use client'

import { Timer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface PomodoroStatsProps {
  totalSessions: number
  weeklyData: { week: string; sessions: number }[]
}

export function PomodoroStats({ totalSessions, weeklyData }: PomodoroStatsProps) {
  return (
    <div className="space-y-6">
      {/* KPIカード */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ポモドーロセッション数</p>
              <p className="text-xl font-bold">{totalSessions}回</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 週別ポモドーログラフ */}
      <Card>
        <CardHeader>
          <CardTitle>週別ポモドーロセッション数</CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyData.length === 0 || weeklyData.every((d) => d.sessions === 0) ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              データがありません
            </div>
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-md">
                            <p className="font-medium">{data.week}週</p>
                            <p className="text-sm text-muted-foreground">
                              セッション数: {data.sessions}回
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar
                    dataKey="sessions"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
