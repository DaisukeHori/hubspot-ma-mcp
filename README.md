<p align="center">
  <strong>◈ HubSpot MA MCP Server</strong>
</p>

<p align="center">
  HubSpot ワークフローを AI アシスタントから直接操作する MCP サーバー
</p>

<p align="center">
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/status-operational-10B981?style=flat-square" alt="Status" /></a>
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/transport-Streamable_HTTP-A5F3FC?style=flat-square" alt="Transport" /></a>
  <a href="https://hubspot-ma-mcp.vercel.app/"><img src="https://img.shields.io/badge/protocol-MCP_2025--03--26-D97706?style=flat-square" alt="Protocol" /></a>
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

## クイック接続

使いたいクライアントを選んでコピペするだけ。  
詳しい手順は **[ランディングページ](https://hubspot-ma-mcp.vercel.app/)** にインタラクティブガイドがあります。

### Claude.ai（Web）

```
設定 → コネクタ → カスタムコネクタを追加 → URL を貼り付け
```

```
https://hubspot-ma-mcp.vercel.app/api/mcp
```

### Claude Desktop

`claude_desktop_config.json` に追加:

| OS | パス |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

```json
{
  "mcpServers": {
    "hubspot-ma": {
      "command": "npx",
      "args": ["mcp-remote", "https://hubspot-ma-mcp.vercel.app/api/mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add --transport http hubspot-ma https://hubspot-ma-mcp.vercel.app/api/mcp
```

### Cursor

`~/.cursor/mcp.json` に追加:

```json
{
  "mcpServers": {
    "hubspot-ma": {
      "type": "http",
      "url": "https://hubspot-ma-mcp.vercel.app/api/mcp"
    }
  }
}
```

### VS Code

```bash
code --add-mcp '{"type":"http","name":"hubspot-ma","url":"https://hubspot-ma-mcp.vercel.app/api/mcp"}'
```

または `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "hubspot-ma": {
      "type": "http",
      "url": "https://hubspot-ma-mcp.vercel.app/api/mcp"
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
      "args": ["mcp-remote", "https://hubspot-ma-mcp.vercel.app/api/mcp"]
    }
  }
}
```

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
    "mcp_servers": [{"type": "url", "url": "https://hubspot-ma-mcp.vercel.app/api/mcp", "name": "hubspot-ma"}],
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

## 自分でデプロイする場合

### 1. HubSpot Private App 作成

1. [HubSpot](https://app.hubspot.com/) → ⚙️ 設定 → Integrations → Private Apps
2. 「Create a private app」→ Scopes で **`automation`** にチェック
3. Access Token をコピー

### 2. デプロイ

```bash
git clone https://github.com/DaisukeHori/hubspot-ma-mcp.git
cd hubspot-ma-mcp
npm install
```

Vercel Environment Variables:

| Key | Value | 必須 |
|---|---|---|
| `HUBSPOT_ACCESS_TOKEN` | `pat-na1-xxxx...` | ✅ |
| `MCP_API_KEY` | 任意（アクセス制限用） | 任意 |

### 3. ローカル開発

```bash
cp .env.example .env.local
npm run dev
```

---

## 技術スタック

| | |
|---|---|
| Framework | Next.js 15 (App Router) |
| MCP Handler | mcp-handler (Streamable HTTP / SSE) |
| API | HubSpot Automation API v4 (Beta) |
| Hosting | Vercel (Fluid Compute) |
| Language | TypeScript |

---

<p align="center">
  <sub>Built by <strong>Revol Corporation</strong> · MIT License</sub>
</p>
