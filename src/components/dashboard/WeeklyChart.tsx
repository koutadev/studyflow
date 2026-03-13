'use client'

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface WeeklyChartProps {
  data: {
    day: string
    minutes: number
  }[]
}

export const WeeklyChart = memo(function WeeklyChart({ data }: WeeklyChartProps) {
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}分`
    if (mins === 0) return `${hours}時間`
    return `${hours}h${mins}m`
  }

  // データの最大値から適切な上限を計算（30分単位で切り上げ）
  const maxMinutes = Math.max(...data.map(d => d.minutes), 30)
  const yAxisMax = Math.ceil(maxMinutes / 30) * 30

  // 30分単位の目盛りを生成
  const ticks = []
  for (let i = 0; i <= yAxisMax; i += 30) {
    ticks.push(i)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">週間学習時間</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatMinutes(value)}
                width={50}
                domain={[0, yAxisMax]}
                ticks={ticks}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-white p-2 shadow-sm dark:bg-zinc-950">
                        <p className="text-sm font-medium">
                          {formatMinutes(payload[0].value as number)}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar
                dataKey="minutes"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
})
