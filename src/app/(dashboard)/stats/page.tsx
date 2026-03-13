import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WeeklyChart } from '@/components/stats/WeeklyChart'
import { MonthlyChart } from '@/components/stats/MonthlyChart'
import { GoalComparison } from '@/components/stats/GoalComparison'
import { StudyStreak } from '@/components/stats/StudyStreak'
import { CategoryBreakdown } from '@/components/stats/CategoryBreakdown'
import { StatsOverview } from '@/components/stats/StatsOverview'
import { PomodoroStats } from '@/components/stats/PomodoroStats'
import { Card, CardContent } from '@/components/ui/card'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  format,
  eachDayOfInterval,
  parseISO,
  differenceInDays,
} from 'date-fns'
import type { Profile, StudyLog, Goal } from '@/types/database'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // プロフィール取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single() as { data: Pick<Profile, 'plan'> | null }

  if (!profile) {
    redirect('/login')
  }

  const isPaid = profile.plan !== 'free'
  const now = new Date()

  // 過去8週間のデータ取得
  const weekStart = startOfWeek(subWeeks(now, 7), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  // 過去12ヶ月のデータ取得
  const monthStart = startOfMonth(subMonths(now, 11))
  const monthEnd = endOfMonth(now)

  // 学習記録取得
  const { data: studyLogs } = await supabase
    .from('study_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('study_date', format(monthStart, 'yyyy-MM-dd'))
    .lte('study_date', format(monthEnd, 'yyyy-MM-dd'))
    .order('study_date', { ascending: true }) as { data: StudyLog[] | null }

  // 目標取得
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order') as { data: Goal[] | null }

  // 統計計算
  const logs = studyLogs || []
  const allGoals = goals || []

  // 週別データ作成
  const weeklyData = calculateWeeklyData(logs, weekStart, now)

  // 月別データ作成
  const monthlyData = calculateMonthlyData(logs, monthStart, now)

  // 目標別データ作成
  const goalData = calculateGoalData(logs, allGoals)

  // カテゴリ別データ作成
  const categoryData = calculateCategoryData(logs, allGoals)

  // ストリーク計算
  const streakData = calculateStreak(logs)

  // 概要統計
  const overviewData = calculateOverview(logs)

  // ポモドーロ統計
  const pomodoroData = calculatePomodoroData(logs, weekStart, now)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">統計</h1>
        <p className="text-muted-foreground mt-1">
          学習の進捗と傾向を分析します
        </p>
      </div>

      {/* 概要カード */}
      <StatsOverview data={overviewData} />

      {/* ストリーク */}
      <StudyStreak data={streakData} />

      {/* 週別グラフ */}
      <WeeklyChart data={weeklyData} />

      {/* ポモドーロ統計 */}
      <PomodoroStats
        totalSessions={pomodoroData.totalSessions}
        weeklyData={pomodoroData.weeklyData}
      />

      {/* 有料プラン限定機能 */}
      {isPaid ? (
        <>
          {/* 月別グラフ */}
          <MonthlyChart data={monthlyData} />

          {/* 目標別比較 */}
          <GoalComparison data={goalData} />

          {/* カテゴリ別分析 */}
          <CategoryBreakdown data={categoryData} />
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              詳細な統計はProプラン以上で利用できます
            </h3>
            <p className="text-muted-foreground mb-4">
              月別推移、目標別比較、カテゴリ分析などの詳細な統計機能をご利用いただけます
            </p>
            <Button asChild>
              <Link href="/pricing">プランをアップグレード</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function calculateWeeklyData(logs: StudyLog[], startDate: Date, endDate: Date) {
  const weeks: { week: string; minutes: number; days: number }[] = []
  let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 1 })

  while (currentWeekStart <= endDate) {
    const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
    const weekLogs = logs.filter((log) => {
      const logDate = parseISO(log.study_date)
      return logDate >= currentWeekStart && logDate <= currentWeekEnd
    })

    const minutes = weekLogs.reduce((sum, log) => sum + log.duration_minutes, 0)
    const uniqueDays = new Set(weekLogs.map((log) => log.study_date)).size

    weeks.push({
      week: format(currentWeekStart, 'M/d'),
      minutes,
      days: uniqueDays,
    })

    currentWeekStart = subWeeks(currentWeekStart, -1)
  }

  return weeks
}

function calculateMonthlyData(logs: StudyLog[], startDate: Date, endDate: Date) {
  const months: { month: string; minutes: number; days: number }[] = []
  let currentMonth = startOfMonth(startDate)

  while (currentMonth <= endDate) {
    const monthEnd = endOfMonth(currentMonth)
    const monthLogs = logs.filter((log) => {
      const logDate = parseISO(log.study_date)
      return logDate >= currentMonth && logDate <= monthEnd
    })

    const minutes = monthLogs.reduce((sum, log) => sum + log.duration_minutes, 0)
    const uniqueDays = new Set(monthLogs.map((log) => log.study_date)).size

    months.push({
      month: format(currentMonth, 'M月'),
      minutes,
      days: uniqueDays,
    })

    currentMonth = subMonths(currentMonth, -1)
  }

  return months
}

function calculateGoalData(logs: StudyLog[], goals: Goal[]) {
  return goals.map((goal) => {
    const goalLogs = logs.filter((log) => log.goal_id === goal.id)
    const totalMinutes = goalLogs.reduce((sum, log) => sum + log.duration_minutes, 0)
    const totalSessions = goalLogs.length

    return {
      id: goal.id,
      title: goal.title,
      color: goal.color,
      totalMinutes,
      totalSessions,
      targetHours: goal.target_hours,
      progress: goal.progress_percent,
    }
  })
}

function calculateCategoryData(logs: StudyLog[], goals: Goal[]) {
  const categories: Record<string, { minutes: number; sessions: number }> = {
    programming: { minutes: 0, sessions: 0 },
    language: { minutes: 0, sessions: 0 },
    certification: { minutes: 0, sessions: 0 },
    other: { minutes: 0, sessions: 0 },
  }

  const goalMap = new Map(goals.map((g) => [g.id, g]))

  logs.forEach((log) => {
    const goal = goalMap.get(log.goal_id)
    if (goal) {
      categories[goal.category].minutes += log.duration_minutes
      categories[goal.category].sessions += 1
    }
  })

  const categoryLabels: Record<string, string> = {
    programming: 'プログラミング',
    language: '語学',
    certification: '資格',
    other: 'その他',
  }

  const categoryColors: Record<string, string> = {
    programming: '#6366f1',
    language: '#22c55e',
    certification: '#f59e0b',
    other: '#8b5cf6',
  }

  return Object.entries(categories)
    .filter(([_, data]) => data.minutes > 0)
    .map(([key, data]) => ({
      category: categoryLabels[key],
      color: categoryColors[key],
      minutes: data.minutes,
      sessions: data.sessions,
    }))
}

function calculateStreak(logs: StudyLog[]) {
  if (logs.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalDays: 0 }
  }

  const uniqueDates = [...new Set(logs.map((log) => log.study_date))].sort()
  const totalDays = uniqueDates.length

  // 現在のストリーク
  let currentStreak = 0
  const today = format(new Date(), 'yyyy-MM-dd')
  const yesterday = format(subWeeks(new Date(), 0).setDate(new Date().getDate() - 1), 'yyyy-MM-dd')

  // 今日または昨日に学習していればストリーク継続
  if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
    let checkDate = uniqueDates.includes(today) ? today : yesterday
    let checkIndex = uniqueDates.indexOf(checkDate)

    while (checkIndex >= 0) {
      const currentDate = uniqueDates[checkIndex]
      const prevDate = checkIndex > 0 ? uniqueDates[checkIndex - 1] : null

      currentStreak++

      if (prevDate) {
        const diff = differenceInDays(parseISO(currentDate), parseISO(prevDate))
        if (diff > 1) break
      }

      checkIndex--
    }
  }

  // 最長ストリーク
  let longestStreak = 1
  let tempStreak = 1

  for (let i = 1; i < uniqueDates.length; i++) {
    const diff = differenceInDays(parseISO(uniqueDates[i]), parseISO(uniqueDates[i - 1]))
    if (diff === 1) {
      tempStreak++
      longestStreak = Math.max(longestStreak, tempStreak)
    } else {
      tempStreak = 1
    }
  }

  return { currentStreak, longestStreak, totalDays }
}

function calculatePomodoroData(logs: StudyLog[], startDate: Date, endDate: Date) {
  const pomodoroLogs = logs.filter((log) => log.note?.includes('ポモドーロ'))
  const totalSessions = pomodoroLogs.length

  const weeks: { week: string; sessions: number }[] = []
  let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 1 })

  while (currentWeekStart <= endDate) {
    const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
    const weekLogs = pomodoroLogs.filter((log) => {
      const logDate = parseISO(log.study_date)
      return logDate >= currentWeekStart && logDate <= currentWeekEnd
    })

    weeks.push({
      week: format(currentWeekStart, 'M/d'),
      sessions: weekLogs.length,
    })

    currentWeekStart = subWeeks(currentWeekStart, -1)
  }

  return { totalSessions, weeklyData: weeks }
}

function calculateOverview(logs: StudyLog[]) {
  const totalMinutes = logs.reduce((sum, log) => sum + log.duration_minutes, 0)
  const totalSessions = logs.length

  // 今週
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const thisWeekLogs = logs.filter((log) => parseISO(log.study_date) >= weekStart)
  const thisWeekMinutes = thisWeekLogs.reduce((sum, log) => sum + log.duration_minutes, 0)

  // 今月
  const monthStart = startOfMonth(new Date())
  const thisMonthLogs = logs.filter((log) => parseISO(log.study_date) >= monthStart)
  const thisMonthMinutes = thisMonthLogs.reduce((sum, log) => sum + log.duration_minutes, 0)

  // 平均
  const uniqueDays = new Set(logs.map((log) => log.study_date)).size
  const avgMinutesPerDay = uniqueDays > 0 ? Math.round(totalMinutes / uniqueDays) : 0

  return {
    totalMinutes,
    totalSessions,
    thisWeekMinutes,
    thisMonthMinutes,
    avgMinutesPerDay,
  }
}
