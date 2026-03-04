<p align="center">
  <strong>◈ HubSpot MA MCP Server</strong>
</p>

<p align="center">
  HubSpot CRM・ワークフロー・CMS を AI アシスタントから直接操作する MCP サーバー
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Fhubspot-ma-mcp&env=AUTH_MODE%2CHUBSPOT_ACCESS_TOKEN%2CMCP_API_KEY&envDescription=AUTH_MODE%3A+hubspot_token%28%E3%83%87%E3%83%95%E3%82%A9%E3%83%AB%E3%83%88%29+or+api_key+%7C+HUBSPOT_ACCESS_TOKEN%3A+api_key%E3%83%A2%E3%83%BC%E3%83%89%E6%99%82%E3%81%AB%E5%BF%85%E9%A0%88+%7C+MCP_API_KEY%3A+api_key%E3%83%A2%E3%83%BC%E3%83%89%E6%99%82%E3%81%AB%E5%BF%85%E9%A0%88&envLink=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Fhubspot-ma-mcp%23%E8%AA%8D%E8%A8%BC%E3%83%A2%E3%83%BC%E3%83%89&project-name=hubspot-ma-mcp&repository-name=hubspot-ma-mcp"><img src="https://vercel.com/button" alt="Deploy with Vercel" /></a>
</p>

<p align="center">
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/status-operational-10B981?style=flat-square" alt="Status" /></a>
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/transport-Streamable_HTTP-A5F3FC?style=flat-square" alt="Transport" /></a>
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/auth-2_modes-FF7A59?style=flat-square" alt="Auth" /></a>
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/protocol-MCP_2025--03--26-FF7A59?style=flat-square" alt="Protocol" /></a>
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/tools-35-FF7A59?style=flat-square" alt="Tools" /></a>
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

## ツール一覧（35ツール）

### Workflow（Automation v4 API）

| ツール | 説明 |
|---|---|
| `workflow_list` | ワークフロー一覧取得 |
| `workflow_get` | ワークフロー詳細取得（ID指定） |
| `workflow_create` | ワークフロー作成（デフォルト無効） |
| `workflow_update` | ワークフロー更新（revisionId 自動取得） |
| `workflow_delete` | ワークフロー削除（`confirm=true` 必須） |
| `workflow_batch_read` | 複数ワークフロー一括取得 |

### CRM Contacts（v3 API）

| ツール | 説明 |
|---|---|
| `contact_search` | コンタクト検索（名前・メール・プロパティフィルター） |
| `contact_get` | コンタクト詳細取得（関連オブジェクト取得可） |
| `contact_create` | コンタクト新規作成 |
| `contact_update` | コンタクト更新 |

### CRM Companies（v3 API）

| ツール | 説明 |
|---|---|
| `company_search` | 会社検索（名前・ドメイン等） |
| `company_get` | 会社詳細取得 |
| `company_create` | 会社新規作成 |

### CRM Deals（v3 API）

| ツール | 説明 |
|---|---|
| `deal_search` | 取引検索 |
| `deal_get` | 取引詳細取得 |
| `deal_create` | 取引新規作成 |
| `deal_update` | 取引更新（ステージ変更・金額変更等） |

### CRM Tickets（v3 API）

| ツール | 説明 |
|---|---|
| `ticket_search` | チケット検索 |
| `ticket_create` | チケット新規作成 |

### Properties（CRUD）

| ツール | 説明 |
|---|---|
| `properties_list` | プロパティ定義一覧取得 |
| `property_create` | カスタムプロパティ作成（type/fieldType/groupName 指定） |
| `property_update` | プロパティ更新（ラベル・説明・選択肢） |
| `property_delete` | プロパティ削除（`confirm=true` 必須） |

### Pipelines（CRUD）

| ツール | 説明 |
|---|---|
| `pipeline_list` | パイプライン一覧取得（Deals/Tickets） |
| `pipeline_create` | パイプライン新規作成（ステージ定義付き） |
| `pipeline_update` | パイプライン更新（ラベル・ステージ変更） |

### Line Items（v3 API）

| ツール | 説明 |
|---|---|
| `lineitem_search` | 明細行検索 |
| `lineitem_create` | 明細行作成（取引への紐付け対応） |
| `lineitem_update` | 明細行更新 |

### Products（v3 API）

| ツール | 説明 |
|---|---|
| `product_search` | 商品ライブラリ検索 |
| `product_create` | 商品登録（SKU・価格・請求周期） |

### CMS（Blog & Pages）

| ツール | 説明 |
|---|---|
| `cms_blog_list` | ブログ記事一覧取得 |
| `cms_blog_update` | ブログ記事更新（タイトル・本文・公開状態） |
| `cms_page_list` | ランディングページ/サイトページ一覧取得 |
| `cms_page_update` | ページ更新（タイトル・スラグ・公開状態） |

---

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
| API | HubSpot CRM v3 + CMS v3 + Automation v4 (Beta) |
| Hosting | Vercel (Fluid Compute) |
| Language | TypeScript |

---

<p align="center">
  <sub>Built by <strong><a href="https://revol.co.jp">Revol Co., Ltd.</a></strong> · MIT License</sub>
</p>
