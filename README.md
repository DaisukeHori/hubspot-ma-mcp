# HubSpot MA MCP Server

HubSpot Marketing Automation を AI アシスタントから操作するための MCP (Model Context Protocol) サーバー。  
Vercel にデプロイ済みで、各種 AI ツールからすぐに接続できます。

## 接続情報

| 項目 | 値 |
|---|---|
| **MCP エンドポイント** | `https://hubspot-ma-mcp.vercel.app/api/mcp` |
| **トランスポート** | Streamable HTTP |
| **プロトコル** | MCP 2025-03-26 |

---

## クイック接続（各クライアント別）

### Claude.ai（Web / Pro・Max・Team・Enterprise）

1. **設定** → **コネクタ** → **「カスタムコネクタを追加」**
2. URL に以下を入力して「追加」:

```
https://hubspot-ma-mcp.vercel.app/api/mcp
```

> ※ Pro 以上のプランが必要です。

---

### Claude Desktop

`claude_desktop_config.json` に以下を追加:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "hubspot-ma": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://hubspot-ma-mcp.vercel.app/api/mcp"
      ]
    }
  }
}
```

設定後、Claude Desktop を再起動してください。

---

### Claude Code

ターミナルで以下を実行:

```bash
claude mcp add --transport http hubspot-ma https://hubspot-ma-mcp.vercel.app/api/mcp
```

JSON 形式で追加する場合:

```bash
claude mcp add-json hubspot-ma '{"type":"http","url":"https://hubspot-ma-mcp.vercel.app/api/mcp"}'
```

ユーザーグローバルに追加（全プロジェクトで使用）:

```bash
claude mcp add --transport http hubspot-ma https://hubspot-ma-mcp.vercel.app/api/mcp --scope user
```

---

### Cursor

**方法①: GUI から追加**

1. `Cmd/Ctrl + ,` で設定を開く
2. **Tools & Integrations** → **New MCP Server**
3. Name: `hubspot-ma`、Type: `http`、URL を入力

**方法②: 設定ファイルを直接編集**

`~/.cursor/mcp.json` を編集:

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

---

### VS Code

**方法①: コマンドラインから追加**

```bash
code --add-mcp '{"type":"http","name":"hubspot-ma","url":"https://hubspot-ma-mcp.vercel.app/api/mcp"}'
```

**方法②: 設定ファイルを編集**

`.vscode/mcp.json` （ワークスペース）または ユーザー設定の `mcp.json`:

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

---

### Windsurf

`Cmd/Ctrl + ,` → Cascade → MCP servers → Add Server:

```json
{
  "mcpServers": {
    "hubspot-ma": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://hubspot-ma-mcp.vercel.app/api/mcp"
      ]
    }
  }
}
```

---

### Anthropic API（MCP Connector Beta）

```json
{
  "model": "claude-sonnet-4-5-20250929",
  "max_tokens": 4096,
  "messages": [
    { "role": "user", "content": "HubSpotのワークフロー一覧を取得して" }
  ],
  "mcp_servers": [
    {
      "type": "url",
      "url": "https://hubspot-ma-mcp.vercel.app/api/mcp",
      "name": "hubspot-ma"
    }
  ],
  "tools": [
    {
      "type": "mcp_toolset",
      "mcp_server_name": "hubspot-ma"
    }
  ]
}
```

> ヘッダーに `"anthropic-beta": "mcp-client-2025-11-20"` が必要です。

---

## ツール一覧

| ツール | 説明 |
|---|---|
| `workflow_list` | ワークフロー一覧取得 |
| `workflow_get` | ワークフロー詳細取得（ID指定） |
| `workflow_create` | ワークフロー作成 |
| `workflow_update` | ワークフロー更新（revisionId 自動取得） |
| `workflow_delete` | ワークフロー削除（confirm=true 必須） |
| `workflow_batch_read` | 複数ワークフロー一括取得 |

---

## セットアップ（自分でデプロイする場合）

### 1. HubSpot Private App の作成

1. [HubSpot](https://app.hubspot.com/) にログイン
2. ⚙️ 設定 → **Integrations** → **Private Apps**（Legacy Apps）
3. 「Create a private app」→ Scopes タブで **`automation`** にチェック
4. 作成後、**Access Token** をコピー

### 2. Vercel にデプロイ

```bash
git clone https://github.com/DaisukeHori/hubspot-ma-mcp.git
cd hubspot-ma-mcp
npm install
```

Vercel にデプロイ後、Environment Variables を設定:

| Key | Value | 必須 |
|---|---|---|
| `HUBSPOT_ACCESS_TOKEN` | `pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | ✅ |
| `MCP_API_KEY` | 任意の文字列（アクセス制限用） | 任意 |

### 3. ローカル開発

```bash
cp .env.example .env.local
# .env.local を編集して HUBSPOT_ACCESS_TOKEN を設定
npm run dev
```

エンドポイント: `http://localhost:3000/api/mcp`

---

## 技術スタック

- **Next.js 15** (App Router)
- **mcp-handler** (Streamable HTTP / SSE 自動切替)
- **HubSpot Automation API v4** (Beta)
- **Vercel** (Fluid Compute)
- **TypeScript**

---

## ライセンス

MIT
