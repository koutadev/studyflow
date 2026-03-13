'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Goal, StudyLog } from '@/types/database'

export async function saveTimerSession(data: {
  goal_id: string
  duration_minutes: number
  note: string | null
  mood: 'great' | 'good' | 'neutral' | 'difficult'
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証が必要です' }
  }

  if (data.duration_minutes <= 0) {
    return { error: '学習時間がありません' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { error } = await sb.from('study_logs').insert({
    user_id: user.id,
    goal_id: data.goal_id,
    duration_minutes: data.duration_minutes,
    study_date: new Date().toISOString().split('T')[0],
    note: data.note,
    mood: data.mood,
  })

  if (error) {
    return { error: error.message }
  }

  // 目標の進捗を更新
  const { data: goal } = await supabase
    .from('goals')
    .select('target_hours')
    .eq('id', data.goal_id)
    .single() as { data: Pick<Goal, 'target_hours'> | null }

  if (goal?.target_hours) {
    const { data: totalLogs } = await supabase
      .from('study_logs')
      .select('duration_minutes')
      .eq('goal_id', data.goal_id) as { data: Pick<StudyLog, 'duration_minutes'>[] | null }

    const totalMinutes = totalLogs?.reduce((sum, l) => sum + l.duration_minutes, 0) || 0
    const totalHours = totalMinutes / 60
    const progress = Math.min(100, Math.round((totalHours / goal.target_hours) * 100))

    await sb
      .from('goals')
      .update({ progress_percent: progress, updated_at: new Date().toISOString() })
      .eq('id', data.goal_id)
  }

  revalidatePath('/timer')
  revalidatePath('/log')
  revalidatePath('/dashboard')
  revalidatePath('/goals')

  return { success: true }
}