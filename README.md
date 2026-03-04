<p align="center">
  <strong>◈ HubSpot MA MCP Server</strong>
</p>

<p align="center">
  HubSpot ワークフローを AI アシスタントから直接操作する MCP サーバー
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Fhubspot-ma-mcp&env=AUTH_MODE%2CHUBSPOT_ACCESS_TOKEN%2CMCP_API_KEY&envDescription=AUTH_MODE%3A+hubspot_token%28%E3%83%87%E3%83%95%E3%82%A9%E3%83%AB%E3%83%88%29+or+api_key+%7C+HUBSPOT_ACCESS_TOKEN%3A+api_key%E3%83%A2%E3%83%BC%E3%83%89%E6%99%82%E3%81%AB%E5%BF%85%E9%A0%88+%7C+MCP_API_KEY%3A+api_key%E3%83%A2%E3%83%BC%E3%83%89%E6%99%82%E3%81%AB%E5%BF%85%E9%A0%88&envLink=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Fhubspot-ma-mcp%23%E8%AA%8D%E8%A8%BC%E3%83%A2%E3%83%BC%E3%83%89&project-name=hubspot-ma-mcp&repository-name=hubspot-ma-mcp"><img src="https://vercel.com/button" alt="Deploy with Vercel" /></a>
</p>

<p align="center">
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/status-operational-10B981?style=flat-square" alt="Status" /></a>
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/transport-Streamable_HTTP-A5F3FC?style=flat-square" alt="Transport" /></a>
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/auth-2_modes-FF7A59?style=flat-square" alt="Auth" /></a>
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/protocol-MCP_2025--03--26-FF7A59?style=flat-square" alt="Protocol" /></a>
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/tools-21-FF7A59?style=flat-square" alt="Tools" /></a>
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

### HubSpot Private App の作成

1. [HubSpot](https://app.hubspot.com/) → ⚙️ 設定 → Integrations → Private Apps
2. 「Create a private app」→ Scopes で **`automation`** にチェック
3. Access Token (`pat-na1-xxxx...`) をコピー

---

## クイック接続

### hubspot_token モード（公開サーバー利用時）

`pat-na1-xxxx...` を自分の HubSpot Private App トークンに置き換えてください。

### api_key モード（自前デプロイ利用時）

`your-mcp-api-key` をデプロイ時に設定した `MCP_API_KEY` に置き換えてください。

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

URLにトークンをクエリパラメータとして含めることで、カスタムヘッダー不要で接続できます。

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

## ツール一覧（21ツール）

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

### Pipelines & Properties

| ツール | 説明 |
|---|---|
| `pipeline_list` | パイプライン一覧取得（Deals/Tickets） |
| `properties_list` | オブジェクトプロパティ定義一覧取得 |

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
| API | HubSpot Automation API v4 (Beta) |
| Hosting | Vercel (Fluid Compute) |
| Language | TypeScript |

---

<p align="center">
  <sub>Built by <strong>Revol Corporation</strong> · MIT License</sub>
</p>
