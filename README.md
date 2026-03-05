<p align="center">
  <strong>◈ HubSpot MA MCP Server</strong>
</p>

<p align="center">
  HubSpot CRM・ワークフロー・メモ・タスク・関連付け・CMS を AI アシスタントから直接操作する MCP サーバー（100ツール）
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Fhubspot-ma-mcp&env=AUTH_MODE%2CHUBSPOT_ACCESS_TOKEN%2CMCP_API_KEY&envDescription=AUTH_MODE%3A+hubspot_token%28%E3%83%87%E3%83%95%E3%82%A9%E3%83%AB%E3%83%88%29+or+api_key+%7C+HUBSPOT_ACCESS_TOKEN%3A+api_key%E3%83%A2%E3%83%BC%E3%83%89%E6%99%82%E3%81%AB%E5%BF%85%E9%A0%88+%7C+MCP_API_KEY%3A+api_key%E3%83%A2%E3%83%BC%E3%83%89%E6%99%82%E3%81%AB%E5%BF%85%E9%A0%88&envLink=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Fhubspot-ma-mcp%23%E8%AA%8D%E8%A8%BC%E3%83%A2%E3%83%BC%E3%83%89&project-name=hubspot-ma-mcp&repository-name=hubspot-ma-mcp"><img src="https://vercel.com/button" alt="Deploy with Vercel" /></a>
</p>

<p align="center">
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/status-operational-10B981?style=flat-square" alt="Status" /></a>
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/transport-Streamable_HTTP-A5F3FC?style=flat-square" alt="Transport" /></a>
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/auth-2_modes-FF7A59?style=flat-square" alt="Auth" /></a>
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/protocol-MCP_2025--03--26-FF7A59?style=flat-square" alt="Protocol" /></a>
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/tools-81-FF7A59?style=flat-square" alt="Tools" /></a>
  <a href="https://vercel.com"><img src="https://img.shields.io/badge/deployed_on-Vercel-000?style=flat-square&logo=vercel" alt="Vercel" /></a>
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" />
</p>

---

## エンドポイント

```
https://hubspot-ma-mcp.vercel.app/api/mcp
```

> 設定ガイド付きランディングページ → **[hubspot-ma-mcp.vercel.app](https://hubspot-ma-mcp.vercel.app/)**

---

## HubSpot Private App の作成

1. [HubSpot](https://app.hubspot.com/) → ⚙️ 設定 → Integrations → Private Apps
2. 「Create a private app」→ アプリ名を入力（例: MCP Server）
3. 「Scopes」タブで下記の権限にチェック
4. 「Create app」→ Access Token (`pat-na1-xxxx...`) をコピー

### 必要なスコープ

| スコープ | 対象ツール | 必須 |
|---|---|---|
| `crm.objects.contacts.read` / `.write` | contact_* | ✓ |
| `crm.objects.companies.read` / `.write` | company_* | ✓ |
| `crm.objects.deals.read` / `.write` | deal_* | ✓ |
| `crm.objects.line_items.read` / `.write` | lineitem_* | ✓ |
| `e-commerce` (products) | product_* | ✓ |
| `tickets` | ticket_* | ✓ |
| `crm.schemas.*.read` / `.write` | property_*, pipeline_* | ✓ |
| `automation` | workflow_* | ✓ |
| `crm.objects.notes.read` / `.write` | note_* | ✓ |
| `crm.objects.tasks.read` / `.write` | task_* | ✓ |
| `crm.objects.quotes.read` | quote_* | ✓ |
| `sales-email-read` / `crm.objects.emails.read` / `.write` | email_* | ✓ |
| `crm.objects.meetings.read` / `.write` | meeting_* | ✓ |
| `crm.objects.calls.read` / `.write` | call_* | ✓ |
| `crm.objects.owners.read` | owner_* | ✓ |
| `content` | cms_blog_*, cms_page_* | 任意 |

> CMS スコープは CMS Hub 契約がある場合のみ利用可能です。

---

## 認証モード

環境変数 `AUTH_MODE` でサーバーの認証方式を切り替えます。

### ① hubspot_token モード（デフォルト）

各ユーザーが自分の HubSpot アクセストークンを Bearer Token として渡します。MCPサーバー自体への認証はありません。

| 項目 | 値 |
|---|---|
| `AUTH_MODE` | `hubspot_token`（またはデフォルト） |
| Bearer Token の中身 | HubSpot Private App トークン (`pat-na1-xxxx...`) |
| MCP サーバー認証 | なし |
| 用途 | 公開サーバー、個人利用、マルチユーザー |

### ② api_key モード

MCP APIキーでサーバーへのアクセスを制限します。HubSpot トークンはサーバーの環境変数に固定設定され、デプロイした組織だけが使えます。

| 項目 | 値 |
|---|---|
| `AUTH_MODE` | `api_key` |
| `MCP_API_KEY` | 任意の秘密文字列（必須） |
| `HUBSPOT_ACCESS_TOKEN` | 組織の HubSpot トークン（必須） |
| Bearer Token の中身 | `MCP_API_KEY` の値 |
| 用途 | チーム専用、組織限定 |

---

## クイック接続

`pat-na1-xxxx...` を自分の HubSpot Private App トークンに置き換えてください。

インタラクティブガイド → **[hubspot-ma-mcp.vercel.app](https://hubspot-ma-mcp.vercel.app/)**

### Claude Desktop

| OS | 設定ファイルパス |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

```json
{
  "mcpServers": {
    "hubspot-ma": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://hubspot-ma-mcp.vercel.app/api/mcp",
        "--header",
        "Authorization:Bearer pat-na1-xxxx..."
      ]
    }
  }
}
```

### Claude Code

```bash
claude mcp add --transport http hubspot-ma \
  https://hubspot-ma-mcp.vercel.app/api/mcp \
  --header "Authorization:Bearer pat-na1-xxxx..."
```

### Cursor

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "hubspot-ma": {
      "type": "http",
      "url": "https://hubspot-ma-mcp.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer pat-na1-xxxx..."
      }
    }
  }
}
```

### VS Code

`.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "hubspot-ma": {
      "type": "http",
      "url": "https://hubspot-ma-mcp.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer pat-na1-xxxx..."
      }
    }
  }
}
```

### Windsurf

```json
{
  "mcpServers": {
    "hubspot-ma": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://hubspot-ma-mcp.vercel.app/api/mcp",
        "--header",
        "Authorization:Bearer pat-na1-xxxx..."
      ]
    }
  }
}
```

### Claude.ai（Web）

```
https://hubspot-ma-mcp.vercel.app/api/mcp?token=pat-na1-xxxx...
```

1. 設定 → コネクタ → 「カスタムコネクタを追加」
2. 上のURL（トークン部分を自分のものに置換）を貼り付けて「追加」

> ⚠ URLにトークンが含まれます。共有PCでの利用にはご注意ください。

### Anthropic API（MCP Connector Beta）

```bash
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: mcp-client-2025-11-20" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 4096,
    "messages": [{"role": "user", "content": "HubSpotのワークフロー一覧を取得して"}],
    "mcp_servers": [{
      "type": "url",
      "url": "https://hubspot-ma-mcp.vercel.app/api/mcp",
      "name": "hubspot-ma",
      "authorization_token": "Bearer pat-na1-xxxx..."
    }],
    "tools": [{"type": "mcp_toolset", "mcp_server_name": "hubspot-ma"}]
  }'
```

---

## ツール一覧（100ツール）

### Workflow（Automation v4）— 6ツール

| ツール | 説明 |
|---|---|
| `workflow_list` | ワークフロー一覧取得 |
| `workflow_get` | ワークフロー詳細取得 |
| `workflow_create` | ワークフロー作成 |
| `workflow_update` | ワークフロー更新 |
| `workflow_delete` | ワークフロー削除 |
| `workflow_batch_read` | 複数ワークフロー一括取得 |

### CRM Contacts — 5ツール（Full CRUD）

| ツール | 説明 |
|---|---|
| `contact_search` | コンタクト検索（ページネーション対応） |
| `contact_get` | コンタクト詳細取得（関連取得可） |
| `contact_create` | コンタクト新規作成 |
| `contact_update` | コンタクト更新 |
| `contact_delete` | コンタクト削除（ゴミ箱） |

### CRM Companies — 5ツール（Full CRUD）

| ツール | 説明 |
|---|---|
| `company_search` | 会社検索 |
| `company_get` | 会社詳細取得 |
| `company_create` | 会社新規作成 |
| `company_update` | 会社更新 |
| `company_delete` | 会社削除（ゴミ箱） |

### CRM Deals — 5ツール（Full CRUD）

| ツール | 説明 |
|---|---|
| `deal_search` | 取引検索 |
| `deal_get` | 取引詳細取得 |
| `deal_create` | 取引新規作成 |
| `deal_update` | 取引更新 |
| `deal_delete` | 取引削除（ゴミ箱） |

### CRM Tickets — 5ツール（Full CRUD）

| ツール | 説明 |
|---|---|
| `ticket_search` | チケット検索 |
| `ticket_get` | チケット詳細取得（関連取得可） |
| `ticket_create` | チケット新規作成 |
| `ticket_update` | チケット更新 |
| `ticket_delete` | チケット削除（ゴミ箱） |

### Notes（メモ）— 5ツール（Full CRUD）

| ツール | 説明 |
|---|---|
| `note_search` | メモ検索 |
| `note_get` | メモ詳細取得（関連レコード取得可） |
| `note_create` | メモ作成（関連付け可） |
| `note_update` | メモ更新 |
| `note_delete` | メモ削除（ゴミ箱・復元可） |

### Tasks（タスク）— 5ツール（Full CRUD）

| ツール | 説明 |
|---|---|
| `task_search` | タスク検索 |
| `task_get` | タスク詳細取得（関連レコード取得可） |
| `task_create` | タスク作成（件名・優先度・期日・関連付け） |
| `task_update` | タスク更新 |
| `task_delete` | タスク削除（ゴミ箱・復元可） |

### Associations（関連付け / v4）— 4ツール

| ツール | 説明 |
|---|---|
| `association_list` | レコード間の関連一覧取得 |
| `association_create` | 関連付け作成（ラベル付き/デフォルト） |
| `association_delete` | 関連付け削除 |
| `association_labels` | ラベル定義の取得・作成（CRUD） |

### Properties — 4ツール

| ツール | 説明 |
|---|---|
| `properties_list` | プロパティ定義一覧取得 |
| `property_create` | カスタムプロパティ作成 |
| `property_update` | プロパティ更新 |
| `property_delete` | プロパティ削除 |

### Pipelines — 4ツール（Full CRUD）

| ツール | 説明 |
|---|---|
| `pipeline_list` | パイプライン一覧取得 |
| `pipeline_create` | パイプライン新規作成 |
| `pipeline_update` | パイプライン更新 |
| `pipeline_delete` | パイプライン削除 |

### Line Items — 5ツール（Full CRUD）

| ツール | 説明 |
|---|---|
| `lineitem_search` | 明細行検索 |
| `lineitem_get` | 明細行詳細取得 |
| `lineitem_create` | 明細行作成 |
| `lineitem_update` | 明細行更新 |
| `lineitem_delete` | 明細行削除 |

### Products — 5ツール（Full CRUD）

| ツール | 説明 |
|---|---|
| `product_search` | 商品検索 |
| `product_get` | 商品詳細取得 |
| `product_create` | 商品登録 |
| `product_update` | 商品更新 |
| `product_delete` | 商品削除 |

### Owners — 2ツール

| Tool | Description |
|------|-------------|
| `owner_list` | 担当者（オーナー）一覧取得 |
| `owner_get` | 担当者詳細取得 |

### Emails（メールエンゲージメント）— 5ツール

| Tool | Description |
|------|-------------|
| `email_search` | メールエンゲージメント検索 |
| `email_get` | メールエンゲージメント詳細取得 |
| `email_create` | メールエンゲージメント作成 |
| `email_update` | メールエンゲージメント更新 |
| `email_delete` | メール永久削除（復元不可） |

### Meetings（ミーティング）— 5ツール

| Tool | Description |
|------|-------------|
| `meeting_search` | ミーティング検索 |
| `meeting_get` | ミーティング詳細取得 |
| `meeting_create` | ミーティング作成 |
| `meeting_update` | ミーティング更新 |
| `meeting_delete` | ミーティング削除 |

### Calls（通話）— 5ツール

| Tool | Description |
|------|-------------|
| `call_search` | 通話記録検索 |
| `call_get` | 通話記録詳細取得 |
| `call_create` | 通話記録作成 |
| `call_update` | 通話記録更新 |
| `call_delete` | 通話記録削除 |

### Quotes（見積もり）— 2ツール

| Tool | Description |
|------|-------------|
| `quote_search` | 見積もり検索 |
| `quote_get` | 見積もり詳細取得 |

### CMS（Blog & Pages）— 4ツール

| ツール | 説明 |
|---|---|
| `cms_blog_list` | ブログ記事一覧取得 |
| `cms_blog_update` | ブログ記事更新 |
| `cms_page_list` | ページ一覧取得 |
| `cms_page_update` | ページ更新 |
| `forms` | フォーム | form_list, form_get, form_create, form_update, form_delete |
| `crm.lists.read` | リスト読取 | list_search, list_get, list_members_get |
| `crm.lists.write` | リスト書込 | list_create, list_delete, list_members_add, list_members_remove |
| `content` | マーケティングメール | marketing_email_list/get/create/update/delete/clone/publish |

---


### Forms（フォーム）— 5ツール

| ツール名 | 説明 |
|:--|:--|
| `form_list` | フォーム一覧取得（タイプ・アーカイブフィルタ対応） |
| `form_get` | フォーム詳細取得（フィールド定義・設定・スタイル含む） |
| `form_create` | マーケティングフォーム作成（フィールド・送信後アクション・GDPR設定） |
| `form_update` | フォーム更新（PUT全体置換） |
| `form_delete` | フォームアーカイブ |

### Lists / Segments（リスト / セグメント）— 7ツール

| ツール名 | 説明 |
|:--|:--|
| `list_create` | リスト作成（MANUAL/DYNAMIC/SNAPSHOT） |
| `list_search` | リスト検索（名前・タイプ・オブジェクトで絞り込み） |
| `list_get` | リスト詳細取得（フィルタ定義含む） |
| `list_delete` | リスト削除（90日以内復元可能） |
| `list_members_get` | リストメンバー一覧取得 |
| `list_members_add` | リストにレコード追加（MANUAL/SNAPSHOTのみ） |
| `list_members_remove` | リストからレコード削除（MANUAL/SNAPSHOTのみ） |

### Marketing Emails（マーケティングメール）— 7ツール

| ツール名 | 説明 |
|:--|:--|
| `marketing_email_list` | マーケティングメール一覧取得（統計・日時フィルタ対応） |
| `marketing_email_get` | マーケティングメール詳細取得（本文・配信先・統計含む） |
| `marketing_email_create` | マーケティングメール作成（DRAFT状態） |
| `marketing_email_update` | マーケティングメール更新（PATCH部分更新） |
| `marketing_email_delete` | マーケティングメールアーカイブ |
| `marketing_email_clone` | マーケティングメール複製（テンプレート再利用） |
| `marketing_email_publish` | マーケティングメール公開/送信（Enterprise必須） |
## 自分でデプロイする

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Fhubspot-ma-mcp&env=AUTH_MODE%2CHUBSPOT_ACCESS_TOKEN%2CMCP_API_KEY&envDescription=AUTH_MODE%3A+hubspot_token%28%E3%83%87%E3%83%95%E3%82%A9%E3%83%AB%E3%83%88%29+or+api_key+%7C+HUBSPOT_ACCESS_TOKEN%3A+api_key%E3%83%A2%E3%83%BC%E3%83%89%E6%99%82%E3%81%AB%E5%BF%85%E9%A0%88+%7C+MCP_API_KEY%3A+api_key%E3%83%A2%E3%83%BC%E3%83%89%E6%99%82%E3%81%AB%E5%BF%85%E9%A0%88&envLink=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Fhubspot-ma-mcp%23%E8%AA%8D%E8%A8%BC%E3%83%A2%E3%83%BC%E3%83%89&project-name=hubspot-ma-mcp&repository-name=hubspot-ma-mcp)

ボタンをクリックすると：

1. GitHub にリポジトリがフォークされます
2. 環境変数の入力を求められます：
   - `AUTH_MODE`: `hubspot_token` または `api_key`
   - `HUBSPOT_ACCESS_TOKEN`: api_key モードでは必須
   - `MCP_API_KEY`: api_key モードでは必須
3. Vercel に自動デプロイされます

### 手動デプロイ

```bash
git clone https://github.com/DaisukeHori/hubspot-ma-mcp.git
cd hubspot-ma-mcp
npm install
cp .env.example .env.local
# .env.local を編集して認証モードとトークンを設定
npm run dev
```

---

## 技術スタック

| | |
|---|---|
| Framework | Next.js 15 (App Router) |
| MCP Handler | mcp-handler (Streamable HTTP / SSE) |
| Auth | 2モード: hubspot_token / api_key |
| API | HubSpot CRM v3 + CMS v3 + Automation v4 (Beta) + Owners API |
| Hosting | Vercel (Fluid Compute) |
| Language | TypeScript |

---

<p align="center">
  <sub>Built by <strong><a href="https://revol.co.jp">Revol Co., Ltd.</a></strong> · MIT License</sub>
</p>
