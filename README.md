<p align="center">
  <strong>◈ HubSpot MA MCP Server</strong>
</p>

<p align="center">
  HubSpot ワークフローを AI アシスタントから直接操作する MCP サーバー
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Fhubspot-ma-mcp&env=HUBSPOT_ACCESS_TOKEN&envDescription=HubSpot%20Private%20App%20Token%EF%BC%88%E8%A8%AD%E5%AE%9A%E2%86%92%E9%80%A3%E6%90%BA%E2%86%92%E9%9D%9E%E5%85%AC%E9%96%8B%E3%82%A2%E3%83%97%E3%83%AA%E3%81%A7%E4%BD%9C%E6%88%90%EF%BC%89&envLink=https%3A%2F%2Fdevelopers.hubspot.com%2Fdocs%2Fapi%2Fprivate-apps&project-name=hubspot-ma-mcp&repository-name=hubspot-ma-mcp"><img src="https://vercel.com/button" alt="Deploy with Vercel" /></a>
</p>

<p align="center">
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/status-operational-10B981?style=flat-square" alt="Status" /></a>
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/transport-Streamable_HTTP-A5F3FC?style=flat-square" alt="Transport" /></a>
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/auth-Bearer_Token-FF7A59?style=flat-square" alt="Auth" /></a>
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/protocol-MCP_2025--03--26-FF7A59?style=flat-square" alt="Protocol" /></a>
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

## 認証方式

自分の HubSpot アカウントのワークフローを操作するには、[HubSpot Private App](https://developers.hubspot.com/docs/api/private-apps) のアクセストークンが必要です。

| 方式 | 説明 | 適用場面 |
|---|---|---|
| **Bearer Token（推奨）** | MCP クライアントの設定で `Authorization: Bearer <token>` ヘッダーを指定 | 公開サーバー利用・個人利用 |
| **環境変数（自前デプロイ用）** | 自分でデプロイしたサーバーに `HUBSPOT_ACCESS_TOKEN` を設定 | チーム共用・自前デプロイ |

> ⚠ **公開サーバーでは Bearer Token が必須です。** トークンなしのリクエストはエラーになります。

### HubSpot Private App の作成

1. [HubSpot](https://app.hubspot.com/) → ⚙️ 設定 → Integrations → Private Apps
2. 「Create a private app」→ Scopes で **`automation`** にチェック
3. Access Token (`pat-na1-xxxx...`) をコピー

---

## クイック接続

各クライアントの設定例を以下に示します。  
`pat-na1-xxxx...` の部分を自分の HubSpot Private App トークンに置き換えてください。

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
設定 → コネクタ → カスタムコネクタを追加 → URL を貼り付け
```

> ⚠ Claude.ai Web ではカスタムヘッダーを設定できないため、自前デプロイ + 環境変数方式が必要です。

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

## ツール一覧

| ツール | 説明 |
|---|---|
| `workflow_list` | ワークフロー一覧取得 |
| `workflow_get` | ワークフロー詳細取得（ID指定） |
| `workflow_create` | ワークフロー作成（デフォルト無効） |
| `workflow_update` | ワークフロー更新（revisionId 自動取得） |
| `workflow_delete` | ワークフロー削除（`confirm=true` 必須） |
| `workflow_batch_read` | 複数ワークフロー一括取得 |

---

## 自分でデプロイする

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDaisukeHori%2Fhubspot-ma-mcp&env=HUBSPOT_ACCESS_TOKEN&envDescription=HubSpot%20Private%20App%20Token%EF%BC%88%E8%A8%AD%E5%AE%9A%E2%86%92%E9%80%A3%E6%90%BA%E2%86%92%E9%9D%9E%E5%85%AC%E9%96%8B%E3%82%A2%E3%83%97%E3%83%AA%E3%81%A7%E4%BD%9C%E6%88%90%EF%BC%89&envLink=https%3A%2F%2Fdevelopers.hubspot.com%2Fdocs%2Fapi%2Fprivate-apps&project-name=hubspot-ma-mcp&repository-name=hubspot-ma-mcp)

ボタンをクリックすると：

1. GitHub にリポジトリがフォークされます
2. `HUBSPOT_ACCESS_TOKEN` の入力を求められます（HubSpot Private App で取得）
3. Vercel に自動デプロイされます

デプロイ後は自分のサーバー URL（`https://your-project.vercel.app/api/mcp`）を使ってください。

### 手動デプロイ

```bash
git clone https://github.com/DaisukeHori/hubspot-ma-mcp.git
cd hubspot-ma-mcp
npm install
cp .env.example .env.local
# .env.local に HUBSPOT_ACCESS_TOKEN を設定
npm run dev
```

---

## 技術スタック

| | |
|---|---|
| Framework | Next.js 15 (App Router) |
| MCP Handler | mcp-handler (Streamable HTTP / SSE) |
| Auth | Bearer Token 必須（公開サーバー） |
| API | HubSpot Automation API v4 (Beta) |
| Hosting | Vercel (Fluid Compute) |
| Language | TypeScript |

---

<p align="center">
  <sub>Built by <strong>Revol Corporation</strong> · MIT License</sub>
</p>
