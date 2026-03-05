# HubSpot MA MCP Server

**AIをHubSpotのマーケティング担当者にする。**

「来月セミナーやるからよろしく」と言うだけで、キャンペーン作成・フォーム作成・リスト作成・メール配信・ワークフロー設計までAIが一貫して実行します。

116のMCPツール + Knowledge Store（暗黙知の記憶） + Claude Skill（行動規範）の3層構造で、単なるAPIラッパーではなく**あなたの会社のHubSpotを理解したMA担当者**として機能します。

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
┌─────────────────────────────────────────┐
│  Claude Skill（固定・全企業共通）         │
│  「MA担当者としてどう判断するか」の規範    │
│  - Knowledge Storeを毎回読め             │
│  - 記載がないことは推測するな、聞け        │
│  - 施策後は必ず記録しろ                   │
│  - このツールマップに従って操作しろ        │
├─────────────────────────────────────────┤
│  Knowledge Store（可変・企業固有）         │
│  HubSpot CRMノートに保存。追加インフラ不要  │
│  - design_decisions: 設計判断の理由        │
│  - naming_conventions: 命名規則           │
│  - playbooks: 施策の実行手順書            │
│  - guardrails: 禁止事項・注意事項         │
│  - brand_voice: トーン・文体ルール        │
│  - history: 過去施策の記録と学び          │
│  - ... 他4カテゴリ（計10カテゴリ）         │
├─────────────────────────────────────────┤
│  MCP Tools（116ツール）                   │
│  HubSpot API を完全カバー                 │
│  CRM / フォーム / リスト / メール / WF /    │
│  キャンペーン / イベント / パイプライン等    │
└─────────────────────────────────────────┘
```

## クイックスタート（3ステップ）

### ステップ1: HubSpot Private Appを作る

1. HubSpot → Settings → Integrations → Private Apps → Create
2. 以下のスコープを付与:

| スコープ | 用途 |
|:--|:--|
| `crm.objects.contacts.read/write` | コンタクト管理 |
| `crm.objects.companies.read/write` | 会社管理 |
| `crm.objects.deals.read/write` | 取引管理 |
| `crm.objects.custom.read/write` | カスタムオブジェクト |
| `crm.schemas.contacts.read` | スキーマ読取 |
| `crm.lists.read/write` | リスト管理 |
| `automation` | ワークフロー |
| `forms` | フォーム |
| `content` | CMS・マーケティングメール |
| `marketing-email` | Single-Send（Enterprise） |
| `marketing.campaigns.read/write` | キャンペーン |
| `analytics.behavioral_events.send` | イベント送信 |
| `behavioral_events.event_definitions.read_write` | イベント定義 |
| `sales-email-read` | メールエンゲージメント |
| `tickets` | チケット |

3. Access Tokenをコピー

### ステップ2: MCPサーバーを接続

**Claude.ai（Web）の場合:**

Settings → MCP → Add → 以下を入力:
- URL: `https://hubspot-ma-mcp.vercel.app/api/mcp`
- Header: `Authorization: Bearer あなたのHubSpotトークン`

**Claude Desktopの場合:**

`claude_desktop_config.json` に追加:
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

**Cursor / VS Code / Windsurf / Claude Code:**

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

### ステップ3: Claude Skillをインストール

1. このリポジトリの `skill/` フォルダをzipにする（または [Releases](https://github.com/DaisukeHori/hubspot-ma-mcp/releases) からダウンロード）
2. Claude.ai → Settings → Customize → Skills → Upload
3. 完了

これで「セミナーやるからよろしく」と言えば、AIがMA担当者として動き始めます。

## 初回セットアップ（Knowledge Store構築）

MCPとSkillを接続したら、最初の会話で以下が自動実行されます:

1. **AIが「Knowledge Storeが空です」と検知**
2. **`hubspot_knowledge_build` を自動実行** → あなたのHubSpotの全設定を読み取り、10カテゴリの下書きを生成
3. **AIから質問リストが提示される** → 例:
   - 「取引パイプラインが1本ですが、意図的にシンプルにしている理由は？」
   - 「チケットパイプラインが未使用ですが、問い合わせ管理はどうしていますか？」
   - 「メール件名にルールはありますか？」
4. **あなたが回答する** → AIがKnowledge Storeを補完
5. **次回以降、AIはこの知識を毎回読み込んで行動する**

一度構築すれば、施策を実行するたびにKnowledge Storeが自動で育っていきます。

## Knowledge Store（10カテゴリ）

AIの「記憶」です。HubSpot内のCRMノートに保存され、追加インフラ不要です。

| カテゴリ | 内容 | 更新タイミング |
|:--|:--|:--|
| `design_decisions` | 設計判断とその理由 | 方針変更時 |
| `naming_conventions` | 命名規則 | 新ルール追加時 |
| `property_annotations` | プロパティの用途・更新方法・依存先 | プロパティ追加時 |
| `workflow_annotations` | WFの目的・テンプレ/個別・依存関係 | WF追加時 |
| `playbooks` | 施策の実行手順書 | 新パターン確立時 |
| `guardrails` | 禁止事項・注意事項 | ルール判明時 |
| `history` | 過去施策の記録と学び | **施策実行後に自動追記** |
| `contacts_segments` | セグメント戦略 | セグメント変更時 |
| `brand_voice` | トーン・文体・件名ルール | ブランド変更時 |
| `integrations` | 外部連携・技術構成 | 連携追加時 |

## ツール一覧（116ツール）

### API操作ツール（111ツール）

| カテゴリ | ツール数 | 操作 |
|:--|:--|:--|
| CRM（Contacts / Companies / Deals / Tickets） | 20 | Full CRUD × 4オブジェクト |
| Engagements（Notes / Tasks / Emails / Meetings / Calls） | 25 | Full CRUD × 5タイプ |
| Associations（v4） | 4 | list / create / delete / labels |
| Properties & Pipelines | 8 | Full CRUD |
| Products & Line Items & Quotes | 12 | Full CRUD + 見積（読取専用） |
| Workflows（Automation v4） | 6 | list / get / create / update / delete / batch_read |
| CMS（Blog & Pages） | 4 | list / update |
| Owners | 2 | list / get |
| Forms（v3） | 5 | list / get / create / update / delete |
| Lists / Segments（v3） | 7 | create / search / get / delete / members管理 |
| Marketing Emails（v3） | 7 | list / get / create / update / delete / clone / publish |
| Single-Send（v4） | 2 | send / status |
| Campaigns（v3） | 5 | list / get / create / update / asset_associate |
| Custom Events（v3） | 4 | define / send / list_definitions / get_occurrences |

### Knowledge Store ツール（5ツール）

| ツール | 説明 |
|:--|:--|
| `hubspot_knowledge_setup` | 初回セットアップ |
| `hubspot_knowledge_build` | 既存設定を自動分析 → 10カテゴリ下書き + 質問リスト生成 |
| `hubspot_knowledge_get` | ナレッジ読み込み（毎回の会話開始時に自動実行） |
| `hubspot_knowledge_update` | ナレッジ更新（replace / append） |
| `hubspot_context_snapshot` | HubSpot全設定の一括スナップショット |

## Claude Skill

`skill/SKILL.md` に同梱。AIの行動規範を定義しています。

- **毎回の初動**: Knowledge Store読み込み → Snapshot → 対応
- **判断の線引き**: 自律的にやること / 必ず確認すること
- **ツールマップ**: 何をしたい時にどのツールを使うか
- **Knowledge Storeの育て方**: いつ何を記録・提案するか

SKILLには企業固有の情報は一切入っていません。どの企業がそのまま使えます。
企業ごとの違いは全てKnowledge Storeに格納されます。

### Claude Code での利用

```bash
mkdir -p .claude/skills/hubspot-ma-operator
cp skill/SKILL.md .claude/skills/hubspot-ma-operator/
cp -r skill/references .claude/skills/hubspot-ma-operator/
```

## 自分でデプロイする

公開エンドポイント（`hubspot-ma-mcp.vercel.app`）をそのまま使うこともできますが、自分のVercelにデプロイすることも可能です。

### 手順

```bash
git clone https://github.com/DaisukeHori/hubspot-ma-mcp.git
cd hubspot-ma-mcp
cp .env.example .env.local
# .env.local を編集して認証モードとトークンを設定
npm install
npm run dev
```

### 認証モード

| モード | 環境変数 | 説明 |
|:--|:--|:--|
| hubspot_token（デフォルト） | `AUTH_MODE=hubspot_token` | クライアントがAuthorizationヘッダーでトークンを送信 |
| api_key | `AUTH_MODE=api_key`, `API_KEY=xxx`, `HUBSPOT_ACCESS_TOKEN=xxx` | サーバー側でトークンを保持 |

### Vercelデプロイ

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/DaisukeHori/hubspot-ma-mcp)

## 技術スタック

Next.js 15 / TypeScript / Vercel / MCP SDK / HubSpot API v3-v4 / Zod
