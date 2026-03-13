import { createClient } from '@/lib/supabase/server'
import { LogForm } from '@/components/study-log/LogForm'
import { LogHistory } from '@/components/study-log/LogHistory'

export default async function LogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // アクティブな目標を取得
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('sort_order')

  // 最近の学習ログを取得（目標情報も含む）
  const { data: logs } = await supabase
    .from('study_logs')
    .select('*, goals(*)')
    .eq('user_id', user.id)
    .order('study_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">学習記録</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <LogForm goals={goals || []} />
        <LogHistory logs={logs || []} goals={goals || []} />
      </div>
    </div>
  )
}
