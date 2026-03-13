import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'ダッシュボード',
}
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { GoalProgressCard } from '@/components/dashboard/GoalProgressCard'
import { WeeklyChart } from '@/components/dashboard/WeeklyChart'
import { StreakBadge } from '@/components/dashboard/StreakBadge'
import { QuickStartCard } from '@/components/dashboard/QuickStartCard'
import { startOfWeek, endOfWeek, subDays, format } from 'date-fns'
import type { Profile, Goal, StudyLog } from '@/types/database'

async function getDashboardData(userId: string) {
  const supabase = await createClient()
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })

  // プロフィール取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single() as { data: Profile | null }

  // アクティブな目標取得
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('sort_order')
    .limit(5) as { data: Goal[] | null }

  // 今日の学習時間
  const { data: todayLogs } = await supabase
    .from('study_logs')
    .select('duration_minutes')
    .eq('user_id', userId)
    .eq('study_date', todayStr) as { data: Pick<StudyLog, 'duration_minutes'>[] | null }

  const todayMinutes = todayLogs?.reduce((sum, log) => sum + log.duration_minutes, 0) || 0

  // 週間学習時間
  const { data: weeklyLogs } = await supabase
    .from('study_logs')
    .select('duration_minutes, study_date')
    .eq('user_id', userId)
    .gte('study_date', format(weekStart, 'yyyy-MM-dd'))
    .lte('study_date', format(weekEnd, 'yyyy-MM-dd')) as { data: Pick<StudyLog, 'duration_minutes' | 'study_date'>[] | null }

  const weeklyMinutes = weeklyLogs?.reduce((sum, log) => sum + log.duration_minutes, 0) || 0

  // 週間チャートデータ
  const weekDays = ['月', '火', '水', '木', '金', '土', '日']
  const chartData = weekDays.map((day, index) => {
    const date = format(
      new Date(weekStart.getTime() + index * 24 * 60 * 60 * 1000),
      'yyyy-MM-dd'
    )
    const dayLogs = weeklyLogs?.filter((log) => log.study_date === date) || []
    const minutes = dayLogs.reduce((sum, log) => sum + log.duration_minutes, 0)
    return { day, minutes }
  })

  // 総学習時間
  const { data: totalLogs } = await supabase
    .from('study_logs')
    .select('duration_minutes')
    .eq('user_id', userId) as { data: Pick<StudyLog, 'duration_minutes'>[] | null }

  const totalMinutes = totalLogs?.reduce((sum, log) => sum + log.duration_minutes, 0) || 0
  const totalHours = Math.floor(totalMinutes / 60)

  // ストリーク計算（1クエリで過去のユニーク日付を取得して計算）
  const { data: streakLogs } = await supabase
    .from('study_logs')
    .select('study_date')
    .eq('user_id', userId)
    .order('study_date', { ascending: false })
    .limit(400) as { data: Pick<StudyLog, 'study_date'>[] | null }

  let streak = 0
  if (streakLogs && streakLogs.length > 0) {
    const uniqueDates = [...new Set(streakLogs.map((l) => l.study_date))].sort().reverse()
    let checkDate = today

    // 今日記録がなければ昨日から開始
    if (uniqueDates[0] !== todayStr) {
      checkDate = subDays(today, 1)
    }

    for (const date of uniqueDates) {
      const expected = format(checkDate, 'yyyy-MM-dd')
      if (date === expected) {
        streak++
        checkDate = subDays(checkDate, 1)
      } else if (date < expected) {
        break
      }
    }
  }

  // 最近学習した目標（直近のstudy_logsからユニークなgoal_idを取得）
  const { data: recentLogs } = await supabase
    .from('study_logs')
    .select('goal_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10) as { data: Pick<StudyLog, 'goal_id'>[] | null }

  const recentGoalIds = [...new Set(recentLogs?.map((l) => l.goal_id) || [])]
  const recentGoals = (goals || []).filter((g) => recentGoalIds.includes(g.id))
    .sort((a, b) => recentGoalIds.indexOf(a.id) - recentGoalIds.indexOf(b.id))

  return {
    profile,
    goals: goals || [],
    recentGoals: recentGoals.slice(0, 3),
    todayMinutes,
    weeklyMinutes,
    weeklyGoalMinutes: 20 * 60, // 仮に週20時間目標
    totalHours,
    streak,
    chartData,
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const data = await getDashboardData(user.id)

  return (
    <div className="space-y-6">
      <StreakBadge
        streak={data.streak}
        displayName={data.profile?.display_name || 'ユーザー'}
      />

      <QuickStartCard goals={data.goals} recentGoals={data.recentGoals} />

      <SummaryCards
        todayMinutes={data.todayMinutes}
        weeklyMinutes={data.weeklyMinutes}
        weeklyGoalMinutes={data.weeklyGoalMinutes}
        totalHours={data.totalHours}
        streak={data.streak}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <GoalProgressCard goals={data.goals} />
        <WeeklyChart data={data.chartData} />
      </div>
    </div>
  )
}
