import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { addDays, format, subDays } from 'date-fns'

// .env.localを読み込む
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const DEMO_EMAIL = 'demo@studyflow.app'
const DEMO_PASSWORD = 'demo1234'

// 学習履歴の日数（統計画面の月別推移が埋まるよう約6ヶ月分）
const HISTORY_DAYS = 180

// 実行のたびに同じ見た目になるよう固定シードの乱数を使う
let seed = 20261030
function random(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]
}

const today = new Date()
const daysAgo = (n: number) => format(subDays(today, n), 'yyyy-MM-dd')
const daysLater = (n: number) => format(addDays(today, n), 'yyyy-MM-dd')

async function seedDemo() {
  console.log('Creating demo account...')

  // 1. デモユーザー作成
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log('Demo user already exists, fetching...')
      const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const demoUser = users?.users.find(u => u.email === DEMO_EMAIL)
      if (!demoUser) {
        console.error('Could not find demo user')
        return
      }
      await seedData(demoUser.id)
      return
    }
    console.error('Auth error:', authError)
    return
  }

  if (!authData.user) {
    console.error('No user created')
    return
  }

  await seedData(authData.user.id)
}

type GoalSeed = {
  id: string
  title: string
  category: 'programming' | 'language' | 'certification' | 'other'
  target_hours: number
  status: 'active' | 'completed' | 'paused' | 'archived'
  // 学習記録を作る期間（何日前〜何日前）
  activeFrom: number
  activeTo: number
}

async function seedData(userId: string) {
  console.log('User ID:', userId)

  // 既存データを削除（milestones / ai_plan_items は goals・ai_plans の CASCADE で削除される）
  await supabase.from('study_logs').delete().eq('user_id', userId)
  await supabase.from('ai_plans').delete().eq('user_id', userId)
  await supabase.from('goals').delete().eq('user_id', userId)
  console.log('Existing data cleared')

  // 2. プロフィール更新
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: DEMO_EMAIL,
      display_name: 'デモユーザー',
      plan: 'pro',
    })

  if (profileError) {
    console.error('Profile error:', profileError)
  } else {
    console.log('Profile updated')
  }

  // 3. 目標作成（スキーマに合わせる）
  const goalSeeds: GoalSeed[] = [
    { id: crypto.randomUUID(), title: 'TOEIC 800点突破', category: 'language', target_hours: 200, status: 'active', activeFrom: HISTORY_DAYS, activeTo: 0 },
    { id: crypto.randomUUID(), title: 'React/Next.js マスター', category: 'programming', target_hours: 150, status: 'active', activeFrom: HISTORY_DAYS, activeTo: 0 },
    { id: crypto.randomUUID(), title: 'AWS認定資格取得', category: 'certification', target_hours: 100, status: 'active', activeFrom: 90, activeTo: 0 },
    { id: crypto.randomUUID(), title: '基本情報技術者試験 合格', category: 'certification', target_hours: 40, status: 'completed', activeFrom: HISTORY_DAYS, activeTo: 104 },
    { id: crypto.randomUUID(), title: '韓国語 日常会話レベル', category: 'language', target_hours: 60, status: 'paused', activeFrom: 150, activeTo: 45 },
  ]
  const [toeic, react, aws, fe, korean] = goalSeeds

  const goalDetails: Record<string, { description: string; target_date: string; color: string }> = {
    [toeic.id]: { description: '来年3月の公開テストでTOEIC 800点を達成する', target_date: daysLater(150), color: '#6366f1' },
    [react.id]: { description: 'App Router / Server Actions を使った個人開発ができるようになる', target_date: daysLater(90), color: '#10b981' },
    [aws.id]: { description: 'AWS Solutions Architect Associate取得', target_date: daysLater(50), color: '#f59e0b' },
    [fe.id]: { description: '7月の試験で基本情報技術者試験に合格する', target_date: daysAgo(103), color: '#0ea5e9' },
    [korean.id]: { description: '旅行で困らない程度の日常会話を身につける（仕事が落ち着くまで一時停止中）', target_date: daysLater(240), color: '#ec4899' },
  }

  // 4. 学習記録作成（約6ヶ月分）
  // 直近14日は毎日学習（現在のストリーク）、60〜82日前も連続（最長ストリーク）、それ以外はときどき休む
  const studyLogs: Record<string, unknown>[] = []
  const moods = ['great', 'good', 'good', 'neutral', 'difficult'] as const

  for (let i = HISTORY_DAYS; i >= 0; i--) {
    const forced = i <= 13 || (i >= 60 && i <= 82)
    if (!forced && random() < 0.25) continue

    const date = subDays(today, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const candidates = goalSeeds.filter(g => i <= g.activeFrom && i >= g.activeTo)
    if (candidates.length === 0) continue

    const logCount = Math.min(candidates.length, (isWeekend ? 2 : 1) + Math.floor(random() * 2))
    const shuffled = [...candidates].sort(() => random() - 0.5).slice(0, logCount)

    shuffled.forEach((goal, j) => {
      const isPomodoro = random() < 0.45
      let duration: number
      let note: string
      if (isPomodoro) {
        const sessions = 1 + Math.floor(random() * (isWeekend ? 6 : 4))
        duration = sessions * 25
        note = `ポモドーロ ${sessions}セッション完了`
      } else {
        duration = pick(isWeekend ? [60, 90, 120, 150] : [20, 30, 45, 60, 90])
        note = pick(NOTES[goal.title])
      }

      const hour = isWeekend ? 10 + j * 4 : 19 + j * 2
      studyLogs.push({
        id: crypto.randomUUID(),
        user_id: userId,
        goal_id: goal.id,
        study_date: dateStr,
        duration_minutes: duration,
        note,
        mood: pick(moods),
        created_at: `${dateStr}T${String(Math.min(hour, 23)).padStart(2, '0')}:${String(Math.floor(random() * 60)).padStart(2, '0')}:00+09:00`,
      })
    })
  }

  // 進捗率は学習時間 / 目標時間から算出（アプリ側と同じ計算）
  const minutesByGoal = new Map<string, number>()
  for (const log of studyLogs) {
    const goalId = log.goal_id as string
    minutesByGoal.set(goalId, (minutesByGoal.get(goalId) ?? 0) + (log.duration_minutes as number))
  }

  const goals = goalSeeds.map((g, index) => {
    const hours = (minutesByGoal.get(g.id) ?? 0) / 60
    const progress = g.status === 'completed' ? 100 : Math.min(100, Math.round((hours / g.target_hours) * 100))
    return {
      id: g.id,
      user_id: userId,
      title: g.title,
      description: goalDetails[g.id].description,
      target_hours: g.target_hours,
      target_date: goalDetails[g.id].target_date,
      status: g.status,
      category: g.category,
      progress_percent: progress,
      color: goalDetails[g.id].color,
      sort_order: index,
      created_at: `${daysAgo(g.activeFrom + 1)}T21:00:00+09:00`,
    }
  })

  const { error: goalsError } = await supabase.from('goals').insert(goals)

  if (goalsError) {
    console.error('Goals error:', goalsError)
    return
  }
  console.log('Goals created:', goals.length)

  const { error: logsError } = await supabase.from('study_logs').insert(studyLogs)

  if (logsError) {
    console.error('Study logs error:', logsError)
  } else {
    const pomodoroCount = studyLogs.filter(l => (l.note as string).includes('ポモドーロ')).length
    console.log(`Study logs created: ${studyLogs.length} (pomodoro: ${pomodoroCount})`)
  }

  // 5. マイルストーン作成
  const milestone = (goalId: string, sort_order: number, title: string, target: string, completedDaysAgo?: number) => ({
    goal_id: goalId,
    title,
    target_date: target,
    is_completed: completedDaysAgo !== undefined,
    completed_at: completedDaysAgo !== undefined ? `${daysAgo(completedDaysAgo)}T21:00:00+09:00` : null,
    sort_order,
  })

  const milestones = [
    milestone(toeic.id, 0, '公式問題集1冊目を完走', daysAgo(120), 125),
    milestone(toeic.id, 1, '模試で650点', daysAgo(60), 58),
    milestone(toeic.id, 2, '模試で730点', daysLater(30)),
    milestone(toeic.id, 3, '本番で800点', daysLater(150)),
    milestone(react.id, 0, 'React公式チュートリアル完了', daysAgo(150), 152),
    milestone(react.id, 1, 'Next.js App Routerで個人ブログ公開', daysAgo(40), 35),
    milestone(react.id, 2, '認証・決済付きのWebアプリを作る', daysLater(60)),
    milestone(aws.id, 0, 'Udemy講座を1周', daysAgo(30), 28),
    milestone(aws.id, 1, '模擬試験で正答率72%以上', daysLater(25)),
    milestone(aws.id, 2, '本試験に合格', daysLater(50)),
    milestone(fe.id, 0, '科目A 過去問3年分', daysAgo(140), 141),
    milestone(fe.id, 1, '科目B アルゴリズム対策', daysAgo(115), 112),
    milestone(fe.id, 2, '本試験に合格', daysAgo(103), 103),
    milestone(korean.id, 0, 'ハングルを読めるようになる', daysAgo(120), 118),
    milestone(korean.id, 1, '基本フレーズ100個', daysAgo(30)),
  ]

  const { error: milestonesError } = await supabase.from('milestones').insert(milestones)

  if (milestonesError) {
    console.error('Milestones error:', milestonesError)
  } else {
    console.log('Milestones created:', milestones.length)
  }

  // 6. AI計画作成
  const toeicPlanId = crypto.randomUUID()
  const awsPlanId = crypto.randomUUID()
  const aiPlans = [
    {
      id: toeicPlanId,
      user_id: userId,
      goal_id: toeic.id,
      title: 'TOEIC 800点達成プラン',
      prompt_used: 'TOEIC 800点を達成するための学習計画を作成してください',
      raw_response: JSON.stringify({
        overview: 'TOEIC 800点達成に向けた3ヶ月間の学習プラン',
        weeklyHours: 10,
      }),
      total_days: 90,
      is_active: true,
      created_at: `${daysAgo(10)}T20:00:00+09:00`,
    },
    {
      id: awsPlanId,
      user_id: userId,
      goal_id: aws.id,
      title: 'AWS SAA 合格プラン',
      prompt_used: 'AWS Solutions Architect Associateに50日で合格するための学習計画を作成してください',
      raw_response: JSON.stringify({
        overview: '模擬試験中心に弱点分野を潰していく50日間のプラン',
        weeklyHours: 8,
      }),
      total_days: 50,
      is_active: true,
      created_at: `${daysAgo(4)}T21:30:00+09:00`,
    },
  ]

  const { error: plansError } = await supabase.from('ai_plans').insert(aiPlans)

  if (plansError) {
    console.error('AI plans error:', plansError)
  } else {
    console.log('AI plans created:', aiPlans.length)
  }

  // 7. AI計画アイテム作成
  const done = (n: number) => ({ is_completed: true, completed_at: `${daysAgo(n)}T21:00:00+09:00` })
  const planItems = [
    { plan_id: toeicPlanId, day_number: 1, title: '基礎文法の復習 - Day 1', description: '中学・高校レベルの文法を総復習', estimated_minutes: 60, ...done(9), sort_order: 0 },
    { plan_id: toeicPlanId, day_number: 2, title: '基礎文法の復習 - Day 2', description: '時制と受動態の復習', estimated_minutes: 60, ...done(8), sort_order: 1 },
    { plan_id: toeicPlanId, day_number: 3, title: '単語学習 - 100語', description: 'TOEIC頻出単語を100語覚える', estimated_minutes: 45, ...done(7), sort_order: 2 },
    { plan_id: toeicPlanId, day_number: 4, title: 'リスニング Part 1-2', description: '写真描写と応答問題の対策', estimated_minutes: 60, ...done(5), sort_order: 3 },
    { plan_id: toeicPlanId, day_number: 5, title: 'リスニング Part 3-4', description: '会話と説明文問題の対策', estimated_minutes: 60, ...done(3), sort_order: 4 },
    { plan_id: toeicPlanId, day_number: 6, title: 'リーディング Part 5', description: '短文穴埋め問題の対策', estimated_minutes: 60, is_completed: false, sort_order: 5 },
    { plan_id: toeicPlanId, day_number: 7, title: 'リーディング Part 6-7', description: '長文読解のスピードを上げる', estimated_minutes: 75, is_completed: false, sort_order: 6 },
    { plan_id: toeicPlanId, day_number: 8, title: '模擬テスト', description: '本番形式で模擬テストを実施', estimated_minutes: 120, is_completed: false, sort_order: 7 },
    { plan_id: awsPlanId, day_number: 1, title: 'IAM・セキュリティの整理', description: 'IAMポリシー・ロール・STSの違いをまとめる', estimated_minutes: 60, ...done(3), sort_order: 0 },
    { plan_id: awsPlanId, day_number: 2, title: 'VPC設計', description: 'サブネット・NAT・VPCエンドポイントを図解で理解', estimated_minutes: 90, ...done(2), sort_order: 1 },
    { plan_id: awsPlanId, day_number: 3, title: 'ストレージ比較', description: 'S3 / EBS / EFS のユースケースを比較', estimated_minutes: 60, ...done(1), sort_order: 2 },
    { plan_id: awsPlanId, day_number: 4, title: '高可用性アーキテクチャ', description: 'ELB・Auto Scaling・マルチAZ構成', estimated_minutes: 75, is_completed: false, sort_order: 3 },
    { plan_id: awsPlanId, day_number: 5, title: '模擬試験 1回目', description: '65問を130分で解いて弱点を洗い出す', estimated_minutes: 150, is_completed: false, sort_order: 4 },
  ]

  const { error: itemsError } = await supabase.from('ai_plan_items').insert(planItems)

  if (itemsError) {
    console.error('AI plan items error:', itemsError)
  } else {
    console.log('AI plan items created:', planItems.length)
  }

  console.log('\n✅ Demo data seeded successfully!')
  console.log(`\n📧 Email: ${DEMO_EMAIL}`)
  console.log(`🔑 Password: ${DEMO_PASSWORD}`)
}

const NOTES: Record<string, string[]> = {
  'TOEIC 800点突破': [
    'リスニングPart 3の練習',
    '単語帳で50語覚えた',
    '文法問題集を解いた',
    '英語ニュースを聴いた',
    'シャドーイングを実施',
    'Part 7のダブルパッセージを解いた',
  ],
  'React/Next.js マスター': [
    'Reactのチュートリアル完了',
    'Next.js App Routerを学習',
    'TypeScriptの型システムを理解',
    'APIルートを実装',
    'Tailwind CSSでスタイリング',
    'Server Actionsでフォーム送信を実装',
  ],
  'AWS認定資格取得': [
    'AWS公式ドキュメントを読んだ',
    'EC2とVPCの復習',
    'S3のハンズオンラボ',
    'IAMポリシーを理解',
    '模擬問題を解いた',
  ],
  '基本情報技術者試験 合格': [
    '科目Aの過去問を1回分',
    '擬似言語の読み方を練習',
    'ネットワーク分野の復習',
    'データベース・SQLの問題演習',
  ],
  '韓国語 日常会話レベル': [
    'ハングルの書き取り練習',
    '基本フレーズを音読',
    '韓国ドラマを字幕付きで視聴',
    '助詞の使い分けを整理',
  ],
}

seedDemo().catch(console.error)
