import { createClient } from '@/lib/supabase/server'
import { PomodoroTimer } from '@/components/timer/PomodoroTimer'
import type { Goal } from '@/types/database'

export default async function TimerPage({
  searchParams,
}: {
  searchParams: Promise<{ goal?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user!.id)
    .eq('status', 'active')
    .order('sort_order') as { data: Goal[] | null }

  const params = await searchParams
  const initialGoalId = params.goal || undefined

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ポモドーロタイマー</h1>
        <p className="text-muted-foreground">集中と休憩のリズムで効率的に学習しましょう</p>
      </div>
      <PomodoroTimer goals={goals || []} initialGoalId={initialGoalId} />
    </div>
  )
}
