# HubSpot MA MCP Server

HubSpot Marketing Automation を Claude から操作するための MCP サーバー。

## セットアップ

### 1. HubSpot Private App の作成

1. HubSpot > Settings > Integrations > Private Apps
2. 「Create a private app」をクリック
3. Scopes タブで `automation` にチェック
4. 作成後、Access Token をコピー

### 2. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` を編集:

```
HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MCP_API_KEY=your-secure-api-key-here
```

### 3. ローカル開発

```bash
npm install
npm run dev
```

MCP エンドポイント: `http://localhost:3000/api/mcp`

### 4. Vercel デプロイ

1. GitHub にプッシュ
2. Vercel でプロジェクトをインポート
3. Environment Variables に `HUBSPOT_ACCESS_TOKEN` と `MCP_API_KEY` を設定
4. Fluid Compute を有効化（推奨）
5. デプロイ

## Claude からの接続

### Claude.ai (カスタムコネクタ)

```
設定 → コネクタ → カスタムコネクタを追加
URL: https://your-project.vercel.app/api/mcp
```

### Claude Code

```bash
claude mcp add --transport http hubspot-ma https://your-project.vercel.app/api/mcp
```

## ツール一覧

| ツール | 説明 |
|---|---|
| `workflow_list` | ワークフロー一覧取得 |
| `workflow_get` | ワークフロー詳細取得 |
| `workflow_create` | ワークフロー作成 |
| `workflow_update` | ワークフロー更新 |
| `workflow_delete` | ワークフロー削除（要確認） |
| `workflow_batch_read` | ワークフロー一括取得 |

## 技術スタック

- Next.js 15 (App Router)
- mcp-handler (Streamable HTTP)
- HubSpot Automation API v4 (Beta)
- Vercel (Fluid Compute)
