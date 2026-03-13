'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { saveTimerSession } from '@/app/(dashboard)/timer/actions'
import type { Goal } from '@/types/database'
import { toast } from 'sonner'
import { Play, Pause, RotateCcw, Settings, Coffee, Brain, Check } from 'lucide-react'

type TimerMode = 'work' | 'break'
type TimerState = 'idle' | 'running' | 'paused'
type Mood = 'great' | 'good' | 'neutral' | 'difficult'

const moods = [
  { value: 'great' as Mood, label: '絶好調', emoji: '🔥' },
  { value: 'good' as Mood, label: '良い', emoji: '😊' },
  { value: 'neutral' as Mood, label: '普通', emoji: '😐' },
  { value: 'difficult' as Mood, label: '難しかった', emoji: '😓' },
]

interface PomodoroTimerProps {
  goals: Goal[]
  initialGoalId?: string
}

export function PomodoroTimer({ goals, initialGoalId }: PomodoroTimerProps) {
  // 設定
  const [workMinutes, setWorkMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [longBreakMinutes, setLongBreakMinutes] = useState(15)
  const [showSettings, setShowSettings] = useState(false)

  // タイマー状態
  const [mode, setMode] = useState<TimerMode>('work')
  const [timerState, setTimerState] = useState<TimerState>('idle')
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [totalWorkSeconds, setTotalWorkSeconds] = useState(0)
  const [completedSessions, setCompletedSessions] = useState(0)

  // 目標選択
  const [selectedGoalId, setSelectedGoalId] = useState<string>(initialGoalId || '')
  const [note, setNote] = useState('')
  const [selectedMood, setSelectedMood] = useState<Mood>('good')
  const [isSaving, setIsSaving] = useState(false)

  // 音声
  const audioRef = useRef<AudioContext | null>(null)

  const totalSeconds = mode === 'work' ? workMinutes * 60 : breakMinutes * 60
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  // ブラウザタブのタイトルを更新
  useEffect(() => {
    if (timerState === 'idle') {
      document.title = 'ポモドーロタイマー | StudyFlow'
      return
    }

    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    const modeStr = mode === 'work' ? '作業中' : '休憩中'
    document.title = `${timeStr} - ${modeStr} | StudyFlow`

    return () => {
      document.title = 'ポモドーロタイマー | StudyFlow'
    }
  }, [timerState, minutes, seconds, mode])

  const playSound = useCallback((frequency: number) => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      audioRef.current = ctx
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.frequency.value = frequency
      oscillator.type = 'sine'
      gain.gain.value = 0.3
      oscillator.start()
      setTimeout(() => {
        oscillator.stop()
        ctx.close()
      }, 500)
    } catch {
      // 音声再生に失敗しても無視
    }
  }, [])

  // タイマーのカウントダウン
  useEffect(() => {
    if (timerState !== 'running') return

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (mode === 'work') {
            const newCompleted = completedSessions + 1
            setTotalWorkSeconds((t) => t + totalSeconds)
            setCompletedSessions(newCompleted)
            setMode('break')
            playSound(800) // 作業完了: 800Hz

            // 4セッションごとに長い休憩
            if (newCompleted % 4 === 0) {
              toast.success(`${newCompleted}セッション完了！長い休憩にしましょう 🎉`)
              return longBreakMinutes * 60
            } else {
              toast.success('作業セッション完了！休憩しましょう 🎉')
              return breakMinutes * 60
            }
          } else {
            setMode('work')
            playSound(600) // 休憩完了: 600Hz
            toast.success('休憩終了！次のセッションを始めましょう 💪')
            return workMinutes * 60
          }
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timerState, mode, workMinutes, breakMinutes, longBreakMinutes, totalSeconds, completedSessions, playSound])

  // 作業中の秒数を加算
  useEffect(() => {
    if (timerState !== 'running' || mode !== 'work') return

    const interval = setInterval(() => {
      setTotalWorkSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [timerState, mode])

  function handleStart() {
    if (!selectedGoalId) {
      toast.error('目標を選択してください')
      return
    }
    if (timerState === 'idle') {
      setSecondsLeft(workMinutes * 60)
      setMode('work')
    }
    setTimerState('running')
  }

  function handlePause() {
    setTimerState('paused')
  }

  function handleReset() {
    setTimerState('idle')
    setMode('work')
    setSecondsLeft(workMinutes * 60)
  }

  async function handleSave() {
    if (!selectedGoalId) {
      toast.error('目標を選択してください')
      return
    }

    const totalMinutes = Math.floor(totalWorkSeconds / 60)
    if (totalMinutes <= 0) {
      toast.error('1分以上の学習記録が必要です')
      return
    }

    setIsSaving(true)
    const result = await saveTimerSession({
      goal_id: selectedGoalId,
      duration_minutes: totalMinutes,
      note: note || `ポモドーロ ${completedSessions}セッション完了`,
      mood: selectedMood,
    })
    setIsSaving(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`${totalMinutes}分の学習を記録しました！`)
      setTotalWorkSeconds(0)
      setCompletedSessions(0)
      setNote('')
      handleReset()
    }
  }

  // 円形プログレスバーのSVG
  const radius = 120
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const formatTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600)
    const m = Math.floor((totalSecs % 3600) / 60)
    const s = totalSecs % 60
    if (h > 0) return `${h}時間${m}分${s}秒`
    if (m > 0) return `${m}分${s}秒`
    return `${s}秒`
  }

  // 現在の休憩が長い休憩かどうか
  const isLongBreak = mode === 'break' && completedSessions > 0 && completedSessions % 4 === 0
  const currentBreakLabel = isLongBreak ? `${longBreakMinutes}分の長い休憩` : `${breakMinutes}分の休憩`

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* メインタイマー */}
      <div className="lg:col-span-2">
        <Card>
          <CardContent className="pt-6">
            {/* 目標選択 */}
            <div className="mb-8">
              <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="学習する目標を選択" />
                </SelectTrigger>
                <SelectContent>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: goal.color }}
                        />
                        {goal.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* タイマー表示 */}
            <div className="flex flex-col items-center">
              {/* モード表示 */}
              <div className={`flex items-center gap-2 mb-6 px-4 py-2 rounded-full text-sm font-medium ${
                mode === 'work'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {mode === 'work' ? <Brain className="h-4 w-4" /> : <Coffee className="h-4 w-4" />}
                {mode === 'work' ? '作業時間' : isLongBreak ? '長い休憩' : '休憩時間'}
              </div>

              {/* 円形プログレス */}
              <div className="relative w-72 h-72 max-sm:w-56 max-sm:h-56 mb-8">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 280 280">
                  {/* 背景円 */}
                  <circle
                    cx="140"
                    cy="140"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-zinc-200 dark:text-zinc-700"
                  />
                  {/* プログレス円 */}
                  <circle
                    cx="140"
                    cy="140"
                    r={radius}
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className={mode === 'work' ? 'text-indigo-500' : 'text-emerald-500'}
                    stroke="currentColor"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                {/* タイマー数字 */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl max-sm:text-4xl font-mono font-bold tabular-nums">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </span>
                  <span className="text-sm text-muted-foreground mt-2">
                    {mode === 'work' ? `${workMinutes}分の作業` : currentBreakLabel}
                  </span>
                </div>
              </div>

              {/* コントロールボタン */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 max-sm:h-10 max-sm:w-10 rounded-full"
                  onClick={handleReset}
                  disabled={timerState === 'idle'}
                >
                  <RotateCcw className="h-5 w-5 max-sm:h-4 max-sm:w-4" />
                </Button>

                {timerState === 'running' ? (
                  <Button
                    size="icon"
                    className="h-16 w-16 max-sm:h-14 max-sm:w-14 rounded-full bg-orange-500 hover:bg-orange-600"
                    onClick={handlePause}
                  >
                    <Pause className="h-7 w-7 max-sm:h-6 max-sm:w-6" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    className="h-16 w-16 max-sm:h-14 max-sm:w-14 rounded-full bg-indigo-500 hover:bg-indigo-600"
                    onClick={handleStart}
                  >
                    <Play className="h-7 w-7 max-sm:h-6 max-sm:w-6 ml-1" />
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 max-sm:h-10 max-sm:w-10 rounded-full"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="h-5 w-5 max-sm:h-4 max-sm:w-4" />
                </Button>
              </div>

              {/* 設定パネル */}
              {showSettings && (
                <div className="mt-6 p-4 border rounded-lg bg-zinc-50 dark:bg-zinc-800 w-full max-w-xs">
                  <h3 className="text-sm font-semibold mb-3">タイマー設定</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <Label className="text-sm whitespace-nowrap">作業時間</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={60}
                          value={workMinutes}
                          onChange={(e) => {
                            const v = parseInt(e.target.value) || 25
                            setWorkMinutes(v)
                            if (timerState === 'idle' && mode === 'work') setSecondsLeft(v * 60)
                          }}
                          className="w-16 text-center"
                        />
                        <span className="text-sm text-muted-foreground">分</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <Label className="text-sm whitespace-nowrap">休憩時間</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={breakMinutes}
                          onChange={(e) => {
                            const v = parseInt(e.target.value) || 5
                            setBreakMinutes(v)
                            if (timerState === 'idle' && mode === 'break') setSecondsLeft(v * 60)
                          }}
                          className="w-16 text-center"
                        />
                        <span className="text-sm text-muted-foreground">分</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <Label className="text-sm whitespace-nowrap">長い休憩</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={5}
                          max={60}
                          value={longBreakMinutes}
                          onChange={(e) => {
                            const v = parseInt(e.target.value) || 15
                            setLongBreakMinutes(v)
                          }}
                          className="w-16 text-center"
                        />
                        <span className="text-sm text-muted-foreground">分</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      4セッション完了ごとに長い休憩が入ります
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* サイドパネル */}
      <div className="space-y-6">
        {/* セッション情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">今回のセッション</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {completedSessions}
                </div>
                <div className="text-xs text-muted-foreground">完了セッション</div>
              </div>
              <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatTime(totalWorkSeconds)}
                </div>
                <div className="text-xs text-muted-foreground">作業時間合計</div>
              </div>
            </div>

            {/* Mood選択 */}
            <div className="space-y-2">
              <Label className="text-sm">今日の調子</Label>
              <div className="flex gap-2">
                {moods.map((mood) => (
                  <button
                    key={mood.value}
                    type="button"
                    onClick={() => setSelectedMood(mood.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2 flex-1 transition-colors ${
                      selectedMood === mood.value
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="text-xl">{mood.emoji}</span>
                    <span className="text-[10px]">{mood.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* メモ */}
            <div className="space-y-2">
              <Label className="text-sm">メモ（任意）</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="今日学んだこと、気づいたことなど"
                rows={3}
              />
            </div>

            {/* 保存ボタン */}
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={isSaving || totalWorkSeconds < 60}
            >
              <Check className="h-4 w-4 mr-2" />
              {isSaving ? '保存中...' : '学習を記録する'}
            </Button>
            {totalWorkSeconds > 0 && totalWorkSeconds < 60 && (
              <p className="text-xs text-muted-foreground text-center">
                1分以上の学習で記録できます
              </p>
            )}
          </CardContent>
        </Card>

        {/* 使い方 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">使い方</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-sm text-muted-foreground space-y-2">
              <li className="flex gap-2">
                <span className="font-bold text-indigo-500">1.</span>
                学習する目標を選択
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-indigo-500">2.</span>
                ▶ ボタンで作業開始（25分）
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-indigo-500">3.</span>
                作業完了後、自動で休憩（5分）
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-indigo-500">4.</span>
                4セッションごとに長い休憩（15分）
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-indigo-500">5.</span>
                好きなタイミングで「学習を記録」
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
