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
│  Claude Skill（固定・全企業共通）          │
│  「MA担当者としてどう判断するか」の規範     │
│  - Knowledge Storeを毎回読め              │
│  - 自分で調べ尽くしてから人に聞け          │
│  - 施策後は必ず記録しろ                   │
├─────────────────────────────────────────┤
│  Knowledge Store（可変・企業固有）          │
│  HubSpot CRMノートに保存。追加インフラ不要   │
│  - 10カテゴリ（設計判断・命名規則・手順書等） │
│  - hubspot_knowledge_buildで自動構築       │
│  - 施策実行のたびに自動成長                │
├─────────────────────────────────────────┤
│  MCP Tools（116ツール）                   │
│  HubSpot API v3/v4 を完全カバー           │
│  CRM / フォーム / リスト / メール / WF /    │
│  キャンペーン / イベント / パイプライン等     │
└─────────────────────────────────────────┘
```

## クイックスタート（3ステップ）

### ステップ1: HubSpot Private Appを作る

HubSpot → Settings → Integrations → Private Apps → Create

**必要なスコープ:**

| スコープ | 用途 |
|:--|:--|
| `crm.objects.contacts.read/write` | コンタクト |
| `crm.objects.companies.read/write` | 会社 |
| `crm.objects.deals.read/write` | 取引 |
| `crm.objects.custom.read/write` | カスタムオブジェクト |
| `crm.schemas.contacts.read` | スキーマ |
| `crm.lists.read/write` | リスト/セグメント |
| `automation` | ワークフロー |
| `forms` | フォーム |
| `content` | CMS・マーケティングメール |
| `marketing-email` | Single-Send（Enterprise必須） |
| `marketing.campaigns.read/write` | キャンペーン |
| `analytics.behavioral_events.send` | イベント送信 |
| `behavioral_events.event_definitions.read_write` | イベント定義 |
| `sales-email-read` | メールエンゲージメント |
| `tickets` | チケット |

### ステップ2: MCPサーバーを接続

**Claude.ai（Web）:**
Settings → MCP → Add:
- URL: `https://hubspot-ma-mcp.vercel.app/api/mcp`
- Header: `Authorization: Bearer あなたのHubSpotトークン`

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

### ステップ3: Claude Skillをインストール

1. リポジトリの `skill/` フォルダをzipにする（または [Releases](https://github.com/DaisukeHori/hubspot-ma-mcp/releases) からダウンロード）
2. Claude.ai → Settings → Customize → Skills → Upload

これで準備完了。初回の会話でAIが自動的にあなたのHubSpotを学習します。

## 初回オンボーディング

セットアップ後、最初の会話で以下が自動実行されます:

1. **AIがHubSpotの全設定をスキャン** — プロパティ・WF・パイプライン・フォーム・リスト・メール等を一括読み取り
2. **10カテゴリの下書きを自動生成** — 設定データから読み取れることを言語化
3. **自己検証ループを実行** — 「この疑問、自分で追加調査できないか？」を再帰的にチェック。WFの詳細構造・フォームのフィールド・メール件名パターン等を深掘りし、自力で答えが出る疑問は全て解決
4. **本当にわからないことだけをYes/Noで確認** — 例:
   - 「過去メールの70%が【○○】で始まるため、これを件名ルールとして記録します。合っていますか？」
   - 「コンタクトのプロパティ"inquiry_status"で問い合わせを管理しているように見えます。正しいですか？」
5. **回答をもとにKnowledge Storeを確定** — 以降の全会話でAIがこの知識を参照

## ⚠️ 重要な注意事項

### Knowledge Storeが自動作成するもの

初回セットアップ（`hubspot_knowledge_setup` または `hubspot_knowledge_build`）で以下が**自動的にHubSpotアカウント内に作成されます**:

- **コンタクト1件**: `mcp-knowledge@system.internal`（Knowledge Store専用。ライフサイクル: other）
- **CRMノート最大10件**: 上記コンタクトに紐付け。`[MCP_KNOWLEDGE:xxx]` タグ付き

**このコンタクトとノートを削除しないでください。** 削除するとKnowledge Storeの内容が失われます。コンタクト一覧でフィルタする際は `@system.internal` で除外してください。

### メール送信の不可逆性

| ツール | 注意 |
|:--|:--|
| `marketing_email_publish` | **配信対象リスト全員にメールが送信されます。取り消し不可。** 実行前に必ずメール内容と配信先を確認。 |
| `single_send_email` | 指定アドレスにメール1通を送信。**宛先にHubSpotコンタクトが存在しない場合、コンタクトが自動作成されます。** さらに非マーケティングコンタクトは**自動的にマーケティングコンタクトに変更**されます。 |

### 更新・削除操作の注意

| ツール | 注意 |
|:--|:--|
| `form_update` | **PUT（全体置換）** です。省略したフィールドグループは削除されます。必ず `form_get` で現在の定義を取得してから全体を送信してください。 |
| `workflow_update` (isEnabled: true) | ワークフローを有効化すると、エンロールメント条件に合致する**全レコードに対して即座にアクションが実行される可能性**があります。 |
| 全ての `*_delete` ツール | `confirm: true` が必須。ほとんどはゴミ箱移動（復元可能）ですが、`email_delete` は**永久削除（復元不可）**です。 |

### APIレート制限

HubSpotの標準レート制限が適用されます:
- Private App: **1アカウントあたり 500,000リクエスト/日**
- Search API: **1アカウントあたり 4リクエスト/秒**
- `hubspot_context_snapshot` は内部で複数APIを呼び出すため、頻繁な実行は避けてください

### Enterprise必須機能

以下のツールは **Marketing Hub Enterprise** が必要です:
- `marketing_email_publish` — マーケティングメールの送信
- `single_send_email` — 個別テンプレートメール送信
- `custom_event_define` / `custom_event_send` — カスタムイベント

## Knowledge Store（10カテゴリ）

AIの「記憶」。HubSpot内のCRMノートに保存。追加インフラ不要。

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

### Knowledge Store ツール（5ツール）

| ツール | API | 説明 |
|:--|:--|:--|
| `hubspot_knowledge_setup` | Internal | 初回セットアップ（コンタクト+ノート作成） |
| `hubspot_knowledge_build` | Internal | 既存設定を自動分析 → 自己検証 → 下書き+質問 |
| `hubspot_knowledge_get` | Internal | ナレッジ読み込み（毎回の会話開始時に自動実行） |
| `hubspot_knowledge_update` | Internal | ナレッジ更新（replace / append） |
| `hubspot_context_snapshot` | Internal (multi-API) | HubSpot全設定の一括スナップショット |

## Claude Skill

`skill/SKILL.md` に同梱。AIの行動規範を定義。

**SKILLが定義していること:**
- 毎回の初動手順（Knowledge Store読み込み → Snapshot → 対応）
- **自己検証ループ**: 人に聞く前に自分で調べ尽くす再帰的プロトコル
- 判断の線引き（自律 / 確認の基準）
- **確認は仮説付きYes/No**: 8割正しい仮説を立てて聞く
- ツールマップ（何をしたい時にどのツールを使うか）
- Knowledge Storeの育て方
- エラー対応

SKILLには企業固有の情報は一切入っていません。どの企業がそのまま使えます。

### インストール

**Claude.ai:** `skill/` をzip → Settings → Customize → Skills → Upload

**Claude Code:**
```bash
mkdir -p .claude/skills/hubspot-ma-operator
cp skill/SKILL.md .claude/skills/hubspot-ma-operator/
cp -r skill/references .claude/skills/hubspot-ma-operator/
```

## 認証モード

| モード | 環境変数 | 用途 |
|:--|:--|:--|
| `hubspot_token`（デフォルト） | `AUTH_MODE=hubspot_token` | 公開サーバー・個人利用。クライアントがBearerヘッダーでトークンを送信 |
| `api_key` | `AUTH_MODE=api_key`, `API_KEY=xxx`, `HUBSPOT_ACCESS_TOKEN=xxx` | 組織専用。サーバー側でトークン保持 |

## 自分でデプロイする

公開エンドポイント（`hubspot-ma-mcp.vercel.app`）を使うか、自分のVercelにデプロイも可能。

```bash
git clone https://github.com/DaisukeHori/hubspot-ma-mcp.git
cd hubspot-ma-mcp
cp .env.example .env.local
# .env.local を編集
npm install
npm run dev
```

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/DaisukeHori/hubspot-ma-mcp)

## 技術スタック

Next.js 15 / TypeScript / Vercel / MCP SDK / HubSpot API v3-v4 / Zod
