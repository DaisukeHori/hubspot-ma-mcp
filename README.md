# HubSpot MA MCP Server

**AIをHubSpotのマーケティング担当者にする。**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Fhubspot-ma-mcp&env=AUTH_MODE%2CHUBSPOT_ACCESS_TOKEN%2CMCP_API_KEY&envDescription=AUTH_MODE%3A+hubspot_token%28%E3%83%87%E3%83%95%E3%82%A9%E3%83%AB%E3%83%88%29+or+api_key+%7C+HUBSPOT_ACCESS_TOKEN%3A+api_key%E3%83%A2%E3%83%BC%E3%83%89%E6%99%82%E3%81%AB%E5%BF%85%E9%A0%88+%7C+MCP_API_KEY%3A+api_key%E3%83%A2%E3%83%BC%E3%83%89%E6%99%82%E3%81%AB%E5%BF%85%E9%A0%88&envLink=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Fhubspot-ma-mcp%23%E8%AA%8D%E8%A8%BC%E3%83%A2%E3%83%BC%E3%83%89&project-name=hubspot-ma-mcp&repository-name=hubspot-ma-mcp)
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/DaisukeHori/hubspot-ma-mcp)
[![Claude Skill](https://img.shields.io/badge/Claude_Skill-Download-FF7A59)](https://github.com/DaisukeHori/hubspot-ma-mcp/releases/download/v1.0.0/hubspot-ma-operator.zip)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **エンドポイント:** `https://hubspot-ma-mcp.vercel.app/api/mcp`
> **LP:** [daisukehori.github.io/hubspot-ma-mcp](https://daisukehori.github.io/hubspot-ma-mcp/)

「来月セミナーやるからよろしく」と言うだけで、キャンペーン作成・フォーム作成・リスト作成・メール配信・ワークフロー設計までAIが一貫して実行します。

128のMCPツール + Knowledge Store（暗黙知の記憶） + Claude Skill（行動規範）の3層構造で、単なるAPIラッパーではなく**あなたの会社のHubSpotを理解したMA担当者**として機能します。


## 2つの使い方

### 🔧 APIラッパーとして使う（Skillなし）

MCPサーバーを接続するだけ。HubSpotの128 APIをAIから直接操作できます。

```
「山田さんのコンタクト情報を教えて」
「先月作成された取引を一覧して」
「このフォームのフィールドを確認して」
「セミナー申込者リストにメンバーを追加して」
```

Skill不要。Knowledge Store不要。接続して即使える最新のHubSpot API v3/v4対応MCPサーバーです。

### 🧠 AIマーケターとして使う（Skill追加）

Claude Skillを追加すると、AIが「あなたの会社のHubSpotを理解したマーケター」として自走します。

```
「来月セミナーやるからよろしく」
→ 過去パターン参照 → 命名規則遵守 → 禁止事項チェック → 80%自分で組んで提案

「今月の進捗どう？」
→ ボトルネック特定 → 既存顧客LTV分析 → N1分析 → 戦略的な改善提案
```

Knowledge Storeで暗黙知を学習し、使うほど賢くなります。

## なぜ必要か

HubSpot APIをAIから操作できるMCPサーバーは他にもあります。しかし**APIを叩けるだけではMA担当者にはなれません**。

本当のMA担当者は：
- 「うちのHubSpotではパイプラインをあえて使っていない（理由: ○○）」を知っている
- 「セミナーの時はいつもこの手順でやる」というパターンを持っている
- 「このプロパティはWFで自動更新されるから触るな」という禁止事項を守れる
- 「メールの件名は【会社名】で始める」というブランドルールに従える

このMCPサーバーは、こうした**暗黙知をHubSpot自体に保存して学習する仕組み**を内蔵しています。使えば使うほど、あなたの会社のやり方を理解していきます。

## アーキテクチャ

```
┌──────────────────────────────────────────┐
│  Claude Skill（固定・全企業共通）           │
│  MA担当者としての判断規範                   │
│  - Knowledge Storeを毎回読め               │
│  - 自分で調べ尽くしてから人に聞け           │
│  - 施策後は必ず記録しろ                    │
├──────────────────────────────────────────┤
│  Knowledge Store（可変・企業固有）           │
│  HubSpot CRMノートに保存。追加インフラ不要    │
│  12カテゴリ（設計判断・命名規則・手順書等）    │
│  hubspot_knowledge_build で自動構築          │
│  施策実行のたびに自動成長                    │
├──────────────────────────────────────────┤
│  MCP Tools（128ツール）                    │
│  HubSpot API v3/v4 を完全カバー            │
│  CRM / フォーム / リスト / メール / WF 等    │
└──────────────────────────────────────────┘
```

> **Skillなしでも使えます。** MCPサーバーだけ接続すれば128ツールのAPIラッパーとして機能します。Skillを追加すると「MA担当者」としての判断力が加わります。

## 使用例

```
ユーザー: 「来月セミナーやるからよろしく」

AI: Knowledge Storeを確認しています...

    playbooksに「セミナー施策」の標準パターンがあります。
    過去のセミナーフォーム（registration_seminar_202601）を参考に、
    以下の構成で進めます：

    📌 キャンペーン: seminar_202604_spring
    📝 フォーム: registration_seminar_202604
       フィールド: メール（必須）・氏名（必須）・会社名・参加形式
    📋 リスト: seminar_202604_applicants（手動リスト）
    📧 メール: 告知 → 3日前リマインド → 当日リマインド
    ⚡ WF: seminar_registration_flow を複製

    確認事項:
    - セミナー名と日時を教えてください
    - 対象は全コンタクトでよいですか？
    - フォームに追加したいフィールドはありますか？

ユーザー: 「4/20の14時から、オンライン。対象は全員で。フォームはそれでいい」

AI: 承知しました。作成を開始します。
    ✅ キャンペーン作成完了（ID: abc-123）
    ✅ フォーム作成完了（ID: def-456）
    ✅ リスト作成完了（ID: 789）
    ✅ 告知メール下書き作成完了
    ✅ 全アセットをキャンペーンに紐付け完了

    告知メールの件名は「【○○】4/20 オンラインセミナーのご案内」
    で作成しました。内容を確認しますか？
```

## 🔒 セキュリティ

**Q: 公開エンドポイントにHubSpotトークンを送っても大丈夫？**

- 通信は全て **HTTPS（TLS暗号化）** で保護されます
- サーバーは**ステートレス**です。トークンはリクエスト処理中にのみ使用され、**保存もログ出力もされません**
- サーバーにデータベースはありません。HubSpot APIへのプロキシとして動作するだけです
- ソースコードは**全て公開**されています。 `app/api/mcp/route.ts` と `lib/hubspot/auth-context.ts` で処理を確認できます

**それでも不安な場合:** 自分のVercelにデプロイして、api_keyモードで運用できます（後述）。

## クイックスタート（3ステップ）

> **💡 まずは試したい方へ:** [HubSpotのテストアカウント](https://developers.hubspot.com/docs/api/creating-test-accounts) を作成すれば、本番データに影響なく全機能を試せます。

### ステップ1: HubSpot Private Appを作る

HubSpot → Settings → Integrations → Private Apps → Create

**必要なスコープ:**

| スコープ | 用途 | 必須/推奨 |
|:--|:--|:--|
| `crm.objects.contacts.read/write` | コンタクト管理 | ✅ 必須 |
| `crm.objects.companies.read/write` | 会社管理 | ✅ 必須 |
| `crm.objects.deals.read/write` | 取引管理 | ✅ 必須 |
| `crm.schemas.contacts.read` | スキーマ読取 | ✅ 必須 |
| `automation` | ワークフロー | ✅ 必須 |
| `content` | CMS・マーケティングメール | ✅ 必須 |
| `forms` | フォーム | ✅ 必須 |
| `crm.lists.read/write` | リスト/セグメント | ✅ 必須 |
| `tickets` | チケット | 推奨 |
| `sales-email-read` | メールエンゲージメント | 推奨 |
| `crm.objects.custom.read/write` | カスタムオブジェクト | 推奨 |
| `marketing.campaigns.read/write` | キャンペーン | 推奨 |
| `marketing-email` | Single-Send | Enterprise必須 |
| `analytics.behavioral_events.send` | カスタムイベント送信 | Enterprise必須 |
| `behavioral_events.event_definitions.read_write` | イベント定義 | Enterprise必須 |
| `crm.objects.marketing_events.read/write` | マーケティングイベント | 推奨 |

> 推奨スコープがなくても基本機能は動きますが、該当ツール呼び出し時にエラーになります。

### ステップ2: MCPサーバーを接続

公開サーバー（`hubspot-ma-mcp.vercel.app`）を使うか、自分専用サーバーをデプロイできます。

> **💡 自分専用サーバーをデプロイしたい場合:** [自分でデプロイする](#自分でデプロイする)セクションのワンクリックデプロイを使ってください。トークンをサーバー側で管理する安全な構成が可能です。

**Claude.ai（Web）:**
Settings → MCP → Add:
- URL: `https://hubspot-ma-mcp.vercel.app/api/mcp`
- Header名: `Authorization`　値: `Bearer あなたのHubSpotトークン`

**Claude Desktop / Cursor / VS Code / Windsurf:**
```json
{
  "mcpServers": {
    "hubspot-ma": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://hubspot-ma-mcp.vercel.app/api/mcp"],
      "env": {
        "HEADER_Authorization": "Bearer あなたのHubSpotトークン"
      }
    }
  }
}
```

**Claude Code:**
```bash
claude mcp add --transport http hubspot-ma https://hubspot-ma-mcp.vercel.app/api/mcp \
  --header "Authorization: Bearer あなたのHubSpotトークン"
```

### ステップ3: Claude Skillをインストール（推奨）

1. **[hubspot-ma-operator.zip をダウンロード](https://github.com/DaisukeHori/hubspot-ma-mcp/releases/download/v1.0.0/hubspot-ma-operator.zip)**
2. Claude.ai → Settings → Customize → Skills → Upload

> Skillなしでも128ツールはそのまま使えます。Skillを入れると「MA担当者」としての判断力（Knowledge Store活用・自己検証ループ・施策パターン）が加わります。

## 初回オンボーディング（5〜10分）

セットアップ後の最初の会話で自動実行されます:

1. **AIがHubSpotの全設定をスキャン** — プロパティ・WF・パイプライン・フォーム・リスト・メール等を一括読み取り
2. **自己検証ループを実行** — 「この疑問は自分で追加調査できないか？」を再帰的にチェックし、WFの詳細構造・フォームのフィールド・メール件名パターン等を深掘り。自力で答えが出るものは全て解決
3. **本当にわからないことだけをYes/Noで確認** — 例: 「過去メールの70%が【○○】で始まるため件名ルールとして記録します。合っていますか？」
4. **回答をもとにKnowledge Storeを確定** — 以降の全会話でAIがこの知識を参照

## ⚠️ 重要な注意事項

### Knowledge Storeが自動作成するもの

初回セットアップで以下が**HubSpotアカウント内に自動作成されます**:

| 作成物 | 詳細 |
|:--|:--|
| コンタクト1件 | `mcp-knowledge@system.internal`（ライフサイクル: other） |
| CRMノート最大10件 | 上記コンタクトに紐付け。`[MCP_KNOWLEDGE:xxx]` タグ付き |

⚠️ **このコンタクトとノートを削除しないでください。** 削除するとKnowledge Storeの全内容が失われます。コンタクト一覧ではフィルタで `@system.internal` を除外してください。

### メール送信

| ツール | 注意 |
|:--|:--|
| `marketing_email_publish` | 配信リスト全員に送信。**取り消し不可。** |
| `single_send_email` | 1通送信。宛先にコンタクトが存在しない場合 **コンタクトを自動作成** し、**マーケティングコンタクトに自動設定** します。 |

### 更新・削除操作

| ツール | 注意 |
|:--|:--|
| `form_update` | **PUT（全体置換）。** 省略したフィールドグループは削除されます。 |
| `workflow_update`（有効化） | 条件合致する **全レコードに即座にアクション実行** の可能性があります。 |
| `*_delete` 全般 | `confirm: true` 必須。ほとんどはゴミ箱移動（復元可能）。ただし `email_delete` は **永久削除（復元不可）。** |

### Enterprise必須機能

`marketing_email_publish`、`single_send_email`、`custom_event_define/send` は **Marketing Hub Enterprise** が必要です。

### APIレート制限

HubSpot標準制限が適用: Private App 500,000リクエスト/日、Search 4リクエスト/秒。`hubspot_context_snapshot` は内部で複数APIを呼ぶため頻繁な実行は避けてください。

## Knowledge Store（12カテゴリ）

| カテゴリ | 内容 |
|:--|:--|
| `design_decisions` | 設計判断とその理由 |
| `naming_conventions` | 命名規則 |
| `property_annotations` | プロパティの用途・更新方法・依存先 |
| `workflow_annotations` | WFの目的・テンプレ/個別・依存関係 |
| `playbooks` | 施策の実行手順書 |
| `guardrails` | 禁止事項・注意事項 |
| `history` | 過去施策の記録と学び |
| `contacts_segments` | セグメント戦略 |
| `brand_voice` | トーン・文体・件名ルール |
| `integrations` | 外部連携・技術構成 |
| `goals` | マーケティングKPI目標（数値目標・達成基準） |
| `calendar` | 施策カレンダー（スケジュール・準備タスク） |

## ツール一覧（128ツール）

### API操作ツール（122ツール）

| カテゴリ | API | ツール数 | 操作 |
|:--|:--|:--|:--|
| CRM Contacts / Companies / Deals / Tickets | v3 | 20 | Full CRUD × 4 |
| Engagements: Notes / Tasks / Emails / Meetings / Calls | v3 | 25 | Full CRUD × 5 |
| Associations | **v4** | 4 | list / create / delete / labels |
| Properties | v3 | 4 | list / create / update / delete |
| Pipelines | v3 | 4 | list / create / update / delete |
| Products / Line Items | v3 | 10 | Full CRUD × 2 |
| Quotes | v3 | 2 | search / get（読取専用） |
| Workflows | **Automation v4** | 6 | list / get / create / update / delete / batch_read |
| CMS Blog & Pages | v3 | 4 | list / update |
| Owners | v3 | 2 | list / get |
| Forms | Marketing Forms v3 | 5 | list / get / create / update / delete |
| Lists / Segments | v3 | 7 | create / search / get / delete / members管理 |
| Marketing Emails | v3 | 7 | list / get / create / update / delete / clone / publish |
| Single-Send | **v4** | 2 | send / status |
| Campaigns | v3 | 5 | list / get / create / update / asset_associate |
| Custom Events | v3 | 4 | define / send / list_definitions / get_occurrences |
| Goals | v3 (読取専用) | 3 | list / get / search |
| Marketing Events | v3 | 8 | list / get / create / update / delete / attendance / complete / participations |

### Knowledge Store & Review ツール（6ツール）

| ツール | 説明 |
|:--|:--|
| `hubspot_knowledge_setup` | 初回セットアップ |
| `hubspot_knowledge_build` | 既存設定の自動分析 → 自己検証 → 下書き+質問 |
| `hubspot_knowledge_get` | ナレッジ読み込み |
| `hubspot_knowledge_update` | ナレッジ更新（replace / append） |
| `hubspot_context_snapshot` | 全設定の一括スナップショット |
| `hubspot_marketing_review` | マーケティング実績集計 → goals対比で進捗レビュー |

## Claude Skill

`skill/SKILL.md` に同梱。企業固有情報なし・全企業共通。

**定義内容:**
- **マーケター思考**: 森岡毅の確率思考（認知×接触×プレファレンス）、足立光の既存顧客最大化、西口一希のN1分析を適用。施策を増やす前にボトルネック特定と戦略の前提検証を行う
- 毎回の初動 / 自己検証ループ / 判断の線引き / 確認は仮説付きYes/No
- 自発提案プロトコル / ツールマップ / Knowledge Store育成 / エラー対応

**Claude.ai:** **[Skill をダウンロード](https://github.com/DaisukeHori/hubspot-ma-mcp/releases/download/v1.0.0/hubspot-ma-operator.zip)** → Settings → Customize → Skills → Upload
**Claude Code:** `cp -r skill/ .claude/skills/hubspot-ma-operator/`

## チーム利用

- 同じHubSpotトークン → **同じKnowledge Storeを共有**（全員が同じ暗黙知を参照）
- 異なるHubSpotアカウント → **完全に分離**（それぞれ独立したKnowledge Store）

## FAQ

**Q: Knowledge Storeを間違えて更新した場合は？**
→ `hubspot_knowledge_update(category: "xxx", mode: "replace", content: "正しい内容")` で上書き修正。

**Q: mcp-knowledgeコンタクトを誤って削除した場合は？**
→ `hubspot_knowledge_setup` を再実行すればコンタクトとノートが再作成されます。ただし以前の内容は失われます。

**Q: HubSpotのFreeプランでも使える？**
→ CRM操作・プロパティ・パイプライン・フォーム・リスト・Knowledge Store等の大半は利用可能です。メール送信（publish）・Single-Send・カスタムイベントはEnterprise必須です。

**Q: Skillなしでも使える？**
→ はい。MCPサーバーだけで128ツールのAPIラッパーとして機能します。Skillを追加するとMA担当者としての判断力が加わります。

**Q: 認証モードはどちらを選ぶ？**
→ **個人利用・検証:** `hubspot_token`モード（デフォルト）。設定不要、各自がトークンをヘッダーで送信。
→ **チーム運用・本番:** `api_key`モードで自分のVercelにデプロイ。トークンをサーバー側で管理。

## 認証モード

| モード | 用途 | 設定 |
|:--|:--|:--|
| `hubspot_token`（デフォルト） | 個人利用・検証 | 設定不要。Authorizationヘッダーでトークン送信 |
| `api_key` | チーム運用・本番 | `AUTH_MODE=api_key`, `API_KEY=xxx`, `HUBSPOT_ACCESS_TOKEN=xxx` |

## 自分でデプロイする

### Vercel（デフォルト）

```bash
git clone https://github.com/DaisukeHori/hubspot-ma-mcp.git
cd hubspot-ma-mcp
cp .env.example .env.local
# .env.local を編集
npm install
npm run dev
```

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Fhubspot-ma-mcp&env=AUTH_MODE%2CHUBSPOT_ACCESS_TOKEN%2CMCP_API_KEY&envDescription=AUTH_MODE%3A+hubspot_token%28%E3%83%87%E3%83%95%E3%82%A9%E3%83%AB%E3%83%88%29+or+api_key+%7C+HUBSPOT_ACCESS_TOKEN%3A+api_key%E3%83%A2%E3%83%BC%E3%83%89%E6%99%82%E3%81%AB%E5%BF%85%E9%A0%88+%7C+MCP_API_KEY%3A+api_key%E3%83%A2%E3%83%BC%E3%83%89%E6%99%82%E3%81%AB%E5%BF%85%E9%A0%88&envLink=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Fhubspot-ma-mcp%23%E8%AA%8D%E8%A8%BC%E3%83%A2%E3%83%BC%E3%83%89&project-name=hubspot-ma-mcp&repository-name=hubspot-ma-mcp)

### Cloudflare Workers（代替）

同一の `lib/`（128ツール + HubSpotクライアント）を Cloudflare Workers 上で実行する構成。I/O待ち時間が課金されないため、外部API呼び出しが多い用途ではコスト効率が高い。

```bash
git clone https://github.com/DaisukeHori/hubspot-ma-mcp.git
cd hubspot-ma-mcp
npm install
npx wrangler login        # Cloudflare アカウントにログイン
npm run deploy:cf          # wrangler deploy
```

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/DaisukeHori/hubspot-ma-mcp)

**環境変数（シークレット）の設定:**

```bash
# hubspot_token モード（デフォルト）: 設定不要。クライアントがBearerでトークンを渡す
# api_key モード: 以下を設定
npx wrangler secret put MCP_API_KEY
npx wrangler secret put HUBSPOT_ACCESS_TOKEN
# AUTH_MODE は wrangler.jsonc の vars で変更
```

**MCP接続先:**

- Vercel版: `https://hubspot-ma-mcp.vercel.app/api/mcp`
- Workers版: `https://hubspot-ma-mcp.<your-subdomain>.workers.dev/mcp`

認証方式・ツール・動作は両方とも同一です。

## 技術スタック

Next.js 15 / Cloudflare Workers / TypeScript / Cloudflare Agents SDK / MCP SDK / HubSpot API v3-v4 / Zod

## ライセンス

MIT License
