# StudyFlow ブラッシュアップ指示書（Claude Code用）

## プロジェクト概要

- **アプリ名**: StudyFlow - AI学習記録＆進捗管理アプリ
- **リポジトリ**: ~/studyflow
- **技術スタック**: Next.js 14 / TypeScript / Supabase / PostgreSQL / Tailwind CSS / Claude API / Stripe
- **デプロイ先**: Vercel（https://studyflow-indol.vercel.app）
- **DB**: Supabase（PostgreSQL）

## ディレクトリ構成

```
~/studyflow/
├── src/
│   ├── app/
│   │   ├── (auth)/          # 認証画面（login, register）
│   │   ├── (dashboard)/     # ダッシュボード配下
│   │   │   ├── dashboard/   # メインダッシュボード
│   │   │   ├── goals/       # 目標管理
│   │   │   ├── log/         # 学習記録
│   │   │   ├── timer/       # ポモドーロタイマー ← 新規追加
│   │   │   ├── ai-plan/     # AI学習計画
│   │   │   ├── stats/       # 統計
│   │   │   └── settings/    # 設定
│   │   ├── api/             # APIルート
│   │   └── page.tsx         # トップページ
│   ├── components/
│   │   ├── timer/           # タイマーコンポーネント ← 新規追加
│   │   ├── study-log/       # 学習記録コンポーネント
│   │   ├── dashboard/       # ダッシュボードコンポーネント
│   │   ├── layout/          # Sidebar, Header
│   │   └── ui/              # shadcn/ui コンポーネント
│   ├── lib/
│   │   ├── supabase/        # Supabaseクライアント（client.ts, server.ts, admin.ts）
│   │   ├── stripe.ts
│   │   └── utils.ts
│   ├── hooks/
│   ├── types/
│   │   └── database.ts      # Supabase型定義
│   └── middleware.ts
├── supabase/
├── docs/screenshots/
├── next.config.ts
└── package.json
```

## 現在の機能一覧

- ✅ ダッシュボード（KPI表示、目標別進捗、週間学習時間グラフ）
- ✅ 目標管理（CRUD、カテゴリ: programming/language/certification/other）
- ✅ 学習記録（手動登録、学習履歴タイムライン表示）
- ✅ ポモドーロタイマー（円形プログレス、作業/休憩自動切替、学習記録自動保存）
- ✅ AI学習計画（Claude APIで目標に基づく学習プラン生成）
- ✅ 統計（学習ストリーク、週別/月別推移、目標別/カテゴリ別分析）
- ✅ 認証（Supabase Auth）
- ✅ 決済（Stripe フリーミアムモデル）

## DB制約（重要）

- goals.category: 'programming' | 'language' | 'certification' | 'other'
- goals.status: 'active' | 'completed' | 'paused' | 'archived'
- study_logs.mood: 'great' | 'good' | 'neutral' | 'difficult'
- study_logs.duration_minutes: > 0
- goals.progress_percent: 0〜100

## コードパターン（既存に合わせること）

### Server Actions パターン
```typescript
// src/app/(dashboard)/xxx/actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any  // 型エラー回避のパターン
```

### Supabaseクライアント
```typescript
// クライアント側: import { createClient } from '@/lib/supabase/client'
// サーバー側: import { createClient } from '@/lib/supabase/server'
```

### UIコンポーネント
- shadcn/ui を使用（Card, Button, Input, Select, Label, Textarea等）
- Tailwind CSS でスタイリング
- lucide-react でアイコン
- sonner でトースト通知: `import { toast } from 'sonner'`

---

## ブラッシュアップ項目

以下の項目を順番に実装してください。各項目完了後にコミットしてください。

### 1. ポモドーロタイマーの改善

**ファイル**: `src/components/timer/PomodoroTimer.tsx`

- [ ] タイマー動作中にブラウザタブのタイトルを `25:00 - 作業中 | StudyFlow` のように残り時間表示に変更する
- [ ] セッション完了時の音を、作業完了と休憩完了で別の周波数にする（作業完了: 800Hz、休憩完了: 600Hz）
- [ ] 「長い休憩」機能を追加（4セッション完了ごとに15分の長い休憩を自動設定）
- [ ] 設定パネルに「長い休憩時間」の設定項目を追加（デフォルト15分）
- [ ] 保存時にmoodを選択できるUIを追加（LogFormと同じ絵文字ボタンUI）

### 2. タイマーのモバイル対応

**ファイル**: `src/components/timer/PomodoroTimer.tsx`

- [ ] モバイル画面（768px未満）で1カラムレイアウトに切り替え
- [ ] 円形プログレスバーのサイズをモバイルでは小さくする（w-56 h-56）
- [ ] コントロールボタンのサイズをモバイルで調整

### 3. ダッシュボードにタイマークイックスタートを追加

**ファイル**: `src/app/(dashboard)/dashboard/page.tsx` と関連コンポーネント

- [ ] ダッシュボードの上部に「学習を始める」カードを追加
- [ ] 最近学習した目標をワンクリックでタイマー画面に遷移するボタン
- [ ] 遷移先URL: `/timer?goal={goal_id}` のようにクエリパラメータで目標を渡す
- [ ] タイマー画面でクエリパラメータから目標を自動選択

### 4. 学習記録の改善

**ファイル**: `src/components/study-log/LogHistory.tsx`

- [ ] 学習記録一覧に「タイマーで記録」のバッジを表示する仕組みを追加
  - study_logsテーブルにnoteカラムを利用し、「ポモドーロ」を含むログにバッジを表示
- [ ] 学習記録のフィルター機能を追加（目標別、日付範囲）

### 5. 統計画面にタイマーセッション統計を追加

**ファイル**: `src/app/(dashboard)/stats/` 配下

- [ ] 「ポモドーロセッション数」のKPIカードを追加
  - noteに「ポモドーロ」を含むstudy_logsの件数をカウント
- [ ] 週別ポモドーロセッション数の棒グラフを追加

### 6. UI/UX全般の改善

- [ ] サイドバーのモバイル表示改善（ハンバーガーメニュー対応の確認）
- [ ] ダークモードの動作確認と修正（不整合があれば修正）
- [ ] ローディング状態の改善（各ページにSkeletonコンポーネントを追加）
- [ ] エラー画面の改善（src/app/(dashboard)/error.tsx の見た目を整える）

### 7. パフォーマンス改善

- [ ] 統計ページのクエリ最適化（必要に応じてSupabaseのRPC関数を作成）
- [ ] 画像の最適化（next/imageの使用確認）
- [ ] 不要なre-renderの防止（React.memoやuseMemoの適用）

---

## コミットメッセージ規約

```
feat: 新機能追加の場合
fix: バグ修正の場合
refactor: リファクタリングの場合
style: UI/スタイル修正の場合
perf: パフォーマンス改善の場合
docs: ドキュメント修正の場合
```

## 注意事項

- 既存の機能を壊さないこと
- TypeScriptの型エラーは `as any` で回避するパターンが既存コードで使われているので、同じパターンに合わせること
- Supabaseのテーブル制約（上記DB制約セクション）を必ず守ること
- `npm run dev` でエラーなく動作確認してからコミットすること
- Vercelデプロイを想定し、`npm run build` が通ることを確認すること
- `next.config.ts` の `turbopack.root: process.cwd()` は変更しないこと