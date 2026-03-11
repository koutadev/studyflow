# 📚 StudyFlow - AI学習記録＆進捗管理アプリ

AIが最適な学習計画を生成する、学習管理プラットフォーム。

## ⚡ 技術スタック

| カテゴリ | 技術 |
|---------|------|
| Frontend | Next.js 14 / TypeScript / Tailwind CSS |
| Backend | Supabase（Auth / Database / Storage） |
| Database | PostgreSQL（Supabase） |
| AI | Claude API（Anthropic） |
| Payment | Stripe（フリーミアムモデル） |
| Deploy | Vercel |

## 🚀 主な機能

- **ダッシュボード**: 学習時間・進捗率・連続学習日数をリアルタイム表示
- **目標管理**: 学習目標の設定・期限管理・達成率の可視化
- **学習記録**: 日々の学習内容・時間を記録し、カレンダーで振り返り
- **AI学習計画**: Claude APIが目標に合わせた最適な学習プランを自動生成
- **統計・分析**: 学習時間の推移、カテゴリ別の学習量をグラフで可視化
- **認証**: Supabase Authによるメール認証
- **決済**: Stripe連携のフリーミアムモデル（無料プラン / Proプラン）

## 🔧 こだわったポイント

### AI駆動の学習支援
- Claude APIを活用し、ユーザーの目標・進捗に基づいた学習計画を自動生成
- プロンプトエンジニアリングにより、実用的で具体的な提案を実現

### フリーミアム設計
- Stripe Webhookによるサブスクリプション管理
- 無料プランでも基本機能は全て利用可能
- Proプランで AI学習計画の生成回数を拡張

### 開発スタイル
- Claude Codeを活用したAI駆動開発
- 企画から本番デプロイまで4日間で完成

## 🏗️ セットアップ

### 前提条件

- Node.js 18+
- npm
- Supabaseアカウント
- Anthropic APIキー
- Stripeアカウント

### 環境変数

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
ANTHROPIC_API_KEY=your-anthropic-api-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

### 手順

```bash
git clone https://github.com/koutadev/studyflow.git
cd studyflow
npm install
npm run dev
```

http://localhost:3000 でアクセス

## 📐 DB設計（Supabase / PostgreSQL）

主要テーブル:
- **profiles** — ユーザープロフィール・プラン情報
- **goals** — 学習目標（期限・カテゴリ・達成率）
- **study_logs** — 学習記録（日時・時間・内容・カテゴリ）
- **ai_plans** — AI生成の学習計画
- **subscriptions** — Stripeサブスクリプション情報

## 👤 作者

**Kouta** - 元寿司職人 → PHP バックエンドエンジニア

- Portfolio: https://portfolio-chi-sage-eud0tx0pxw.vercel.app
- GitHub: [@koutadev](https://github.com/koutadev)