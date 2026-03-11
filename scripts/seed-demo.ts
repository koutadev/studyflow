import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

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
      const { data: users } = await supabase.auth.admin.listUsers()
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

async function seedData(userId: string) {
  console.log('User ID:', userId)

  // 既存データを削除
  await supabase.from('study_logs').delete().eq('user_id', userId)
  await supabase.from('ai_plan_items').delete().match({})
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
  const goals = [
    {
      id: crypto.randomUUID(),
      user_id: userId,
      title: 'TOEIC 800点突破',
      description: '今年中にTOEIC 800点を達成する',
      target_hours: 200,
      target_date: '2026-12-31',
      status: 'active',
      category: 'language',
      progress_percent: 23,
      color: '#6366f1',
      sort_order: 0,
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      title: 'React/Next.js マスター',
      description: 'フロントエンド開発スキルを向上させる',
      target_hours: 150,
      target_date: '2026-06-30',
      status: 'active',
      category: 'programming',
      progress_percent: 21,
      color: '#10b981',
      sort_order: 1,
    },
    {
      id: crypto.randomUUID(),
      user_id: userId,
      title: 'AWS認定資格取得',
      description: 'AWS Solutions Architect Associate取得',
      target_hours: 100,
      target_date: '2026-09-30',
      status: 'active',
      category: 'certification',
      progress_percent: 15,
      color: '#f59e0b',
      sort_order: 2,
    },
  ]

  const { error: goalsError } = await supabase.from('goals').insert(goals)

  if (goalsError) {
    console.error('Goals error:', goalsError)
  } else {
    console.log('Goals created:', goals.length)
  }

  // 4. 学習記録作成（過去2週間分）
  const studyLogs = []
  const today = new Date()

  for (let i = 13; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    // ランダムに1-3件のログを作成
    const logCount = Math.floor(Math.random() * 3) + 1

    for (let j = 0; j < logCount; j++) {
      const goalIndex = Math.floor(Math.random() * goals.length)
      const duration = [30, 45, 60, 90, 120][Math.floor(Math.random() * 5)]
      const moods = ['great', 'good', 'neutral', 'difficult'] as const

      studyLogs.push({
        id: crypto.randomUUID(),
        user_id: userId,
        goal_id: goals[goalIndex].id,
        study_date: dateStr,
        duration_minutes: duration,
        note: getRandomNote(goals[goalIndex].category),
        mood: moods[Math.floor(Math.random() * moods.length)],
      })
    }
  }

  const { error: logsError } = await supabase.from('study_logs').insert(studyLogs)

  if (logsError) {
    console.error('Study logs error:', logsError)
  } else {
    console.log('Study logs created:', studyLogs.length)
  }

  // 5. AI計画作成
  const planId = crypto.randomUUID()
  const aiPlans = [
    {
      id: planId,
      user_id: userId,
      goal_id: goals[0].id,
      title: 'TOEIC 800点達成プラン',
      prompt_used: 'TOEIC 800点を達成するための学習計画を作成してください',
      raw_response: JSON.stringify({
        overview: 'TOEIC 800点達成に向けた3ヶ月間の学習プラン',
        weeklyHours: 10,
      }),
      total_days: 90,
      is_active: true,
    },
  ]

  const { error: plansError } = await supabase.from('ai_plans').insert(aiPlans)

  if (plansError) {
    console.error('AI plans error:', plansError)
  } else {
    console.log('AI plans created:', aiPlans.length)
  }

  // 6. AI計画アイテム作成
  const planItems = [
    { plan_id: planId, day_number: 1, title: '基礎文法の復習 - Day 1', description: '中学・高校レベルの文法を総復習', estimated_minutes: 60, is_completed: true, sort_order: 0 },
    { plan_id: planId, day_number: 2, title: '基礎文法の復習 - Day 2', description: '時制と受動態の復習', estimated_minutes: 60, is_completed: true, sort_order: 1 },
    { plan_id: planId, day_number: 3, title: '単語学習 - 100語', description: 'TOEIC頻出単語を100語覚える', estimated_minutes: 45, is_completed: true, sort_order: 2 },
    { plan_id: planId, day_number: 4, title: 'リスニング Part 1-2', description: '写真描写と応答問題の対策', estimated_minutes: 60, is_completed: false, sort_order: 3 },
    { plan_id: planId, day_number: 5, title: 'リスニング Part 3-4', description: '会話と説明文問題の対策', estimated_minutes: 60, is_completed: false, sort_order: 4 },
    { plan_id: planId, day_number: 6, title: 'リーディング Part 5', description: '短文穴埋め問題の対策', estimated_minutes: 60, is_completed: false, sort_order: 5 },
    { plan_id: planId, day_number: 7, title: '模擬テスト', description: '本番形式で模擬テストを実施', estimated_minutes: 120, is_completed: false, sort_order: 6 },
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

function getRandomNote(category: string): string {
  const notes: Record<string, string[]> = {
    language: [
      'リスニングPart 3の練習',
      '単語帳で50語覚えた',
      '文法問題集を解いた',
      '英語ニュースを聴いた',
      'シャドーイングを実施',
    ],
    programming: [
      'Reactのチュートリアル完了',
      'Next.js App Routerを学習',
      'TypeScriptの型システムを理解',
      'APIルートを実装',
      'Tailwind CSSでスタイリング',
    ],
    certification: [
      'AWS公式ドキュメントを読んだ',
      'EC2とVPCの復習',
      'S3のハンズオンラボ',
      'IAMポリシーを理解',
      '模擬問題を解いた',
    ],
  }
  const categoryNotes = notes[category] || notes.programming
  return categoryNotes[Math.floor(Math.random() * categoryNotes.length)]
}

seedDemo().catch(console.error)
