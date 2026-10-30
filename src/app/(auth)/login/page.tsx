'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { login } from '../actions'

const DEMO_EMAIL = 'demo@studyflow.app'
const DEMO_PASSWORD = 'demo1234'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
  }

  async function handleDemoLogin() {
    const formData = new FormData()
    formData.set('email', DEMO_EMAIL)
    formData.set('password', DEMO_PASSWORD)
    await handleSubmit(formData)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-white dark:from-zinc-900 dark:to-zinc-950 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-xl">
              SF
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">StudyFlowにログイン</CardTitle>
          <CardDescription>
            メールアドレスとパスワードを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 rounded-md border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/40">
            <p className="mb-1 text-sm font-semibold text-indigo-900 dark:text-indigo-200">
              デモアカウントで試す
            </p>
            <p className="mb-3 text-xs leading-relaxed text-indigo-800/80 dark:text-indigo-300/80">
              登録不要でお試しいただけます。<br />
              {DEMO_EMAIL} / {DEMO_PASSWORD}
            </p>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={handleDemoLogin}
              disabled={isLoading}
            >
              デモアカウントでログイン
            </Button>
          </div>

          <form action={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            アカウントをお持ちでない方は{' '}
            <Link href="/signup" className="text-indigo-600 hover:underline dark:text-indigo-400">
              新規登録
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
