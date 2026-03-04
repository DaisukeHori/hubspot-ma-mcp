# HubSpot MA MCP サーバー アーキテクチャ設計書

## 1. プロジェクト概要

**目的：** Claude.ai から HubSpot のマーケティングオートメーション（MA）を日本語で操作するための MCP サーバーを構築する。

**コンセプト：** Claude 自身が設計・実装した MCP サーバーなので、SKILL.md を通じて自然に使いこなせる。

---

## 2. 全体アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│  Claude.ai                                              │
│  ┌───────────────┐   ┌──────────────────────────────┐  │
│  │  SKILL.md     │──▶│  MCP Client (Claude内蔵)      │  │
│  │  (操作ガイド)  │   │  Streamable HTTP Transport    │  │
│  └───────────────┘   └──────────┬───────────────────┘  │
└─────────────────────────────────┼───────────────────────┘
                                  │ HTTPS
                                  ▼
┌─────────────────────────────────────────────────────────┐
│  Vercel (Fluid Compute)                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Next.js App Router                               │  │
│  │                                                    │  │
│  │  /api/[transport]  (mcp-handler)                  │  │
│  │  ├── POST  → Streamable HTTP リクエスト処理       │  │
│  │  ├── GET   → SSE (後方互換 / 自動処理)           │  │
│  │  └── DELETE → セッション終了                       │  │
│  │                                                    │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  MCP Server (mcp-handler + SDK)            │  │  │
│  │  │                                            │  │  │
│  │  │  Tools:                                    │  │  │
│  │  │  ├── workflow_list                         │  │  │
│  │  │  ├── workflow_get                          │  │  │
│  │  │  ├── workflow_create                       │  │  │
│  │  │  ├── workflow_update                       │  │  │
│  │  │  ├── workflow_delete                       │  │  │
│  │  │  ├── workflow_batch_read                   │  │  │
│  │  │  └── (将来拡張: email, sequence, list)     │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────┘
                                  │ HTTPS (Bearer Token)
                                  ▼
┌─────────────────────────────────────────────────────────┐
│  HubSpot API v4 (Beta)                                  │
│  Base URL: https://api.hubapi.com                       │
│  └── /automation/v4/flows/*                             │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 技術スタック

| レイヤー | 技術 | 理由 |
|---|---|---|
| フレームワーク | Next.js 15 (App Router) | mcp-handler が公式サポート。Vercel テンプレート・実績豊富 |
| MCP ハンドラー | `mcp-handler` (旧 `@vercel/mcp-adapter`) | Next.js 公式対応。Streamable HTTP + SSE 両対応を自動処理 |
| MCP SDK | `@modelcontextprotocol/sdk` ^1.25.2 | 公式 TypeScript SDK。ツール定義・JSON-RPC 処理 |
| バリデーション | `zod` ^3 | MCP SDK の必須依存。ツール入力のスキーマ定義 |
| HTTP クライアント | 組み込み `fetch` | HubSpot API v4 への通信。Node.js 18+ ネイティブ |
| トランスポート | Streamable HTTP (ステートレス) | MCP 仕様 2025-03-26 準拠。Redis 不要 |
| デプロイ | Vercel (Fluid Compute) | GitHub → CI/CD → Vercel の既存フロー活用 |
| 認証情報管理 | Vercel Environment Variables | HubSpot API キー・MCP 認証キーの安全な管理 |
| 型生成 | 手動定義 (将来的に OpenAPI spec から自動生成検討) | HubSpot v4 は Beta で spec が不安定なため |

---

## 4. ディレクトリ構造

```
hubspot-ma-mcp/
├── app/
│   ├── api/
│   │   └── [transport]/
│   │       └── route.ts        # MCP エンドポイント (mcp-handler)
│   ├── layout.tsx
│   └── page.tsx                # ヘルスチェック / ステータス表示
├── lib/
│   ├── mcp/
│   │   ├── server.ts           # MCP サーバー初期化・全ツール登録
│   │   └── tools/
│   │       ├── workflow-list.ts
│   │       ├── workflow-get.ts
│   │       ├── workflow-create.ts
│   │       ├── workflow-update.ts
│   │       ├── workflow-delete.ts
│   │       └── workflow-batch-read.ts
│   ├── hubspot/
│   │   ├── client.ts           # HubSpot API v4 HTTP クライアント
│   │   ├── types.ts            # レスポンス型定義
│   │   └── errors.ts           # エラーハンドリング
│   └── config.ts               # 環境変数管理
├── next.config.ts
├── package.json
├── tsconfig.json
├── vercel.json
└── .env.example
```

---

## 5. MCP ツール設計（Phase 1: ワークフロー CRUD）

### 5.1 `workflow_list` — ワークフロー一覧取得

```
ツール名: workflow_list
説明: HubSpotアカウント内の全ワークフローを一覧取得する
入力パラメータ: なし
HubSpot API: GET /automation/v4/flows
出力: ワークフローID、名前、有効/無効状態、オブジェクトタイプの一覧
```

### 5.2 `workflow_get` — ワークフロー詳細取得

```
ツール名: workflow_get
説明: 指定したワークフローの全詳細（アクション、トリガー条件含む）を取得する
入力パラメータ:
  - flowId: string (必須) — ワークフローID
HubSpot API: GET /automation/v4/flows/{flowId}
出力: ワークフローの完全な仕様（アクション一覧、enrollmentCriteria 等）
```

### 5.3 `workflow_create` — ワークフロー作成

```
ツール名: workflow_create
説明: 新しいワークフローを作成する
入力パラメータ:
  - name: string (必須) — ワークフロー名
  - type: enum ["CONTACT_FLOW", "PLATFORM_FLOW"] (必須)
  - objectTypeId: string (必須) — 対象オブジェクトタイプ
    - "0-1" = コンタクト
    - "0-2" = 会社
    - "0-3" = 取引
    - "0-5" = チケット
  - isEnabled: boolean (デフォルト: false)
  - actions: object[] (オプション) — アクション定義の配列
  - enrollmentCriteria: object (オプション) — トリガー条件
HubSpot API: POST /automation/v4/flows
出力: 作成されたワークフローの完全な仕様
```

### 5.4 `workflow_update` — ワークフロー更新

```
ツール名: workflow_update
説明: 既存ワークフローを更新する。revisionIdは自動取得する
入力パラメータ:
  - flowId: string (必須) — 更新対象のワークフローID
  - updates: object (必須) — 更新内容
    ※ revisionId は内部で最新を自動取得してマージ
HubSpot API:
  1. GET /automation/v4/flows/{flowId}  (最新 revisionId 取得)
  2. PUT /automation/v4/flows/{flowId}  (更新実行)
出力: 更新後のワークフロー仕様
注意: createdAt, updatedAt, dataSources フィールドは自動除去
```

### 5.5 `workflow_delete` — ワークフロー削除

```
ツール名: workflow_delete
説明: ワークフローを削除する（復元不可、HubSpotサポートへの連絡が必要）
入力パラメータ:
  - flowId: string (必須) — 削除対象のワークフローID
  - confirm: boolean (必須) — 削除確認フラグ（trueでないと実行しない）
HubSpot API: DELETE /automation/v4/flows/{flowId}
出力: 削除成功メッセージ
```

### 5.6 `workflow_batch_read` — ワークフロー一括取得

```
ツール名: workflow_batch_read
説明: 複数のワークフローをIDで一括取得する
入力パラメータ:
  - flowIds: string[] (必須) — ワークフローIDの配列
HubSpot API: POST /automation/v4/flows/batch/read
出力: 各ワークフローの詳細情報の配列
```

---

## 6. HubSpot API クライアント設計

### 6.1 認証

```typescript
// Private App の Bearer Token 方式
// 環境変数: HUBSPOT_ACCESS_TOKEN
// スコープ: automation (必須)
headers: {
  'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
}
```

### 6.2 エラーハンドリング方針

| HTTP Status | 対応 |
|---|---|
| 401 | トークン無効 → ユーザーにトークン再設定を案内 |
| 403 | スコープ不足 → 必要なスコープを案内 |
| 404 | ワークフロー未存在 → flowId の確認を案内 |
| 429 | レート制限 → リトライ（Retry-After ヘッダー参照） |
| 5xx | HubSpot側障害 → 時間をおいてリトライ |

### 6.3 レート制限対策

HubSpot API のレート制限に対応するため、以下を実装する：

- `Retry-After` ヘッダーを尊重した自動リトライ
- 最大リトライ回数: 3回
- エクスポネンシャルバックオフ

---

## 7. MCP トランスポート詳細設計

### 7.1 トランスポートの選択: Streamable HTTP

MCP 仕様 2025-03-26 で導入された **Streamable HTTP** を採用する。
旧方式の SSE は非推奨であり、Anthropic も SSE サポートの廃止を予告している。

**Claude の対応状況（2025年時点）：**
- Claude.ai: Streamable HTTP ✅ / SSE ✅（SSE は近い将来廃止予定）
- Claude Desktop: Streamable HTTP ✅ / SSE ✅
- Claude Code: Streamable HTTP ✅ / SSE ✅
- Claude API (MCP Connector): Streamable HTTP ✅ / SSE ✅

→ Streamable HTTP のみ実装で十分。mcp-handler は SSE も自動で処理するため、
  実質的には両対応になる（追加コード不要）。

### 7.2 Streamable HTTP プロトコルフロー

単一の `/api/mcp` エンドポイントで全通信を処理する。

```
┌──────────────────┐                    ┌──────────────────┐
│  Claude (Client)  │                    │  MCP Server      │
│                   │                    │  (/api/mcp)      │
└────────┬─────────┘                    └────────┬─────────┘
         │                                        │
         │  ① POST /api/mcp (Initialize)          │
         │  Content-Type: application/json         │
         │  Accept: application/json,              │
         │          text/event-stream              │
         │ ─────────────────────────────────────▶  │
         │                                        │
         │  ← 200 OK                              │
         │  Content-Type: application/json         │
         │  Mcp-Session-Id: abc123                 │
         │  (InitializeResult)                     │
         │  ◀───────────────────────────────────── │
         │                                        │
         │  ② POST /api/mcp (tools/list)          │
         │  Mcp-Session-Id: abc123                 │
         │ ─────────────────────────────────────▶  │
         │                                        │
         │  ← 200 OK (ツール一覧)                  │
         │  ◀───────────────────────────────────── │
         │                                        │
         │  ③ POST /api/mcp (tools/call)          │
         │  Mcp-Session-Id: abc123                 │
         │ ─────────────────────────────────────▶  │
         │                                        │
         │  ← 200 OK (ツール実行結果)              │
         │  ◀───────────────────────────────────── │
         │                                        │
         │  ④ DELETE /api/mcp (セッション終了)     │
         │  Mcp-Session-Id: abc123                 │
         │ ─────────────────────────────────────▶  │
         │                                        │
         │  ← 200 OK                              │
         │  ◀───────────────────────────────────── │
```

**プロトコル仕様：**

| 項目 | 値 |
|---|---|
| メッセージ形式 | JSON-RPC 2.0 (UTF-8) |
| エンドポイント | `/api/mcp` (単一) |
| HTTP メソッド | POST (リクエスト), GET (SSE※), DELETE (セッション終了) |
| セッション | `Mcp-Session-Id` ヘッダー |
| レスポンス形式 | `application/json`（即時）/ `text/event-stream`（ストリーミング） |

※ mcp-handler が自動処理。開発者側でのSSE実装は不要。

### 7.3 ステートレスモード

Vercel Functions（サーバーレス）に最適な **ステートレスモード** を採用する。

- セッション状態をメモリに保持しない → Redis 等の外部ストア不要
- 各リクエストが完全に独立 → Vercel の水平スケーリングに完全適合
- mcp-handler の `disableSse: true` オプションで SSE を無効化可能
  （Streamable HTTP の POST レスポンスのみで動作）

**トレードオフ：**
- サーバーからの能動的通知（プッシュ型）は不可
- → ワークフローCRUDはリクエスト/レスポンス型なので問題なし

### 7.4 Next.js App Router での実装

mcp-handler を使うと、MCPエンドポイントの実装は極めてシンプルになる。

```typescript
// app/api/[transport]/route.ts

import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { hubspotClient } from "@/lib/hubspot/client";

const handler = createMcpHandler(
  (server) => {
    // ── ワークフロー一覧取得 ──
    server.registerTool(
      "workflow_list",
      {
        title: "ワークフロー一覧取得",
        description: "HubSpotアカウント内の全ワークフローを一覧取得する",
        inputSchema: {},
      },
      async () => {
        const flows = await hubspotClient.listFlows();
        return {
          content: [{
            type: "text",
            text: formatFlowList(flows),
          }],
        };
      }
    );

    // ── ワークフロー詳細取得 ──
    server.registerTool(
      "workflow_get",
      {
        title: "ワークフロー詳細取得",
        description: "指定したワークフローの全詳細を取得する",
        inputSchema: {
          flowId: z.string().describe("ワークフローID"),
        },
      },
      async ({ flowId }) => {
        const flow = await hubspotClient.getFlow(flowId);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(flow, null, 2),
          }],
        };
      }
    );

    // ... 他のツールも同様に登録
  },
  {},
  {
    basePath: "/api",       // [transport] の親パス
    maxDuration: 60,        // 最大実行時間（秒）
    verboseLogs: true,      // 開発時のデバッグログ
    // redisUrl: undefined, // ステートレスなので Redis 不要
  }
);

export { handler as GET, handler as POST };
```

**ポイント:**
- `[transport]` ダイナミックルートにより `/api/mcp` と `/api/sse` が自動生成
- mcp-handler が Streamable HTTP / SSE の振り分けを自動処理
- 開発者はツール定義のみに集中できる
- `basePath: "/api"` は `[transport]` の親ディレクトリと一致させる

### 7.5 Claude.ai からの接続方法

#### Claude.ai Web UI（カスタムコネクタ）

```
設定 → コネクタ → カスタムコネクタを追加
URL: https://hubspot-ma-mcp.vercel.app/api/mcp
認証: Bearer Token (MCP_API_KEY)
```

#### Claude API（MCP Connector）

```json
{
  "model": "claude-sonnet-4-5",
  "max_tokens": 4096,
  "messages": [{ "role": "user", "content": "HubSpotのワークフロー一覧を見せて" }],
  "mcp_servers": [
    {
      "type": "url",
      "url": "https://hubspot-ma-mcp.vercel.app/api/mcp",
      "name": "hubspot-ma",
      "authorization_token": "YOUR_MCP_API_KEY"
    }
  ]
}
```

#### Claude Code

```bash
claude mcp add --transport http hubspot-ma https://hubspot-ma-mcp.vercel.app/api/mcp
```

### 7.6 JSON-RPC メッセージフロー例

**① Initialize**
```json
// Client → Server
{ "jsonrpc": "2.0", "id": 1, "method": "initialize",
  "params": { "protocolVersion": "2025-03-26", "capabilities": {},
    "clientInfo": { "name": "claude-ai", "version": "1.0" } } }

// Server → Client
{ "jsonrpc": "2.0", "id": 1,
  "result": { "protocolVersion": "2025-03-26",
    "capabilities": { "tools": {} },
    "serverInfo": { "name": "hubspot-ma-mcp", "version": "1.0.0" } } }
```

**② tools/call (workflow_list)**
```json
// Client → Server
{ "jsonrpc": "2.0", "id": 3, "method": "tools/call",
  "params": { "name": "workflow_list", "arguments": {} } }

// Server → Client
{ "jsonrpc": "2.0", "id": 3,
  "result": { "content": [{ "type": "text",
    "text": "ワークフロー一覧 (3件):\n1. ID: 123 | 新規リード通知 | 有効\n..." }] } }
```

---

## 8. セキュリティ設計

### 8.1 認証・認可

| 対象 | 方式 | 管理場所 |
|---|---|---|
| HubSpot API | Bearer Token (Private App) | Vercel env: `HUBSPOT_ACCESS_TOKEN` |
| MCP エンドポイント (Phase 1) | API Key ヘッダー | Vercel env: `MCP_API_KEY` |
| MCP エンドポイント (Phase 2) | OAuth 2.1 (MCP 仕様準拠) | 検討中 |

### 8.2 入力バリデーション

- 全ツール入力を Zod スキーマで厳密にバリデーション
- HubSpot API への送信前にサニタイズ

### 8.3 安全策

- `workflow_delete` は明示的な `confirm: true` が必須
- `workflow_create` / `workflow_update` は `isEnabled: false` をデフォルト値
- Origin ヘッダーの検証（DNS リバインディング対策）

---

## 9. Vercel デプロイ設定

### 9.1 vercel.json

```json
{
  "functions": {
    "app/api/[transport]/route.ts": {
      "maxDuration": 60
    }
  }
}
```

### 9.2 Fluid Compute

Vercel ダッシュボードで Fluid Compute を有効化する。

効果:
- 既に起動済みのサーバーインスタンスを再利用
- コールドスタートの大幅削減
- MCP サーバーで CPU 使用量 50%+ 削減の実績あり

### 9.3 CI/CD フロー

```
ホリさん → GitHub push (main) → Vercel 自動ビルド・デプロイ
                                  ├── ビルド: Next.js
                                  ├── 環境変数: HUBSPOT_ACCESS_TOKEN, MCP_API_KEY
                                  └── URL: https://hubspot-ma-mcp.vercel.app
                                       └── /api/mcp → MCP エンドポイント
```

---

## 10. 将来の拡張計画 (Phase 2以降)

| Phase | 機能 | 対応 API |
|---|---|---|
| Phase 2 | メールテンプレート管理 | Marketing Email API |
| Phase 2 | リスト管理（作成・コンタクト追加） | Lists API v3 |
| Phase 3 | シーケンス管理 | Sequences API |
| Phase 3 | フォーム管理 | Forms API v3 |
| Phase 4 | ワークフロー分析・パフォーマンスデータ | Analytics API |

---

## 11. Claude SKILL.md との連携設計

MCP サーバーが完成した後、SKILL.md を作成する。スキルには以下を含める：

- MCP エンドポイントURL の設定方法
- 各ツールの使い方と日本語での指示パターン
- ワークフローの典型的な構成パターン（アクションタイプID一覧含む）
- HubSpot のオブジェクトタイプID対応表
- トラブルシューティングガイド

---

## 12. 開発の進め方

### ステップ 1: プロジェクト初期化
Next.js 15 プロジェクト作成、依存パッケージインストール

### ステップ 2: MCP エンドポイント実装
`app/api/[transport]/route.ts` — mcp-handler でツール登録

### ステップ 3: HubSpot API クライアント実装
`lib/hubspot/client.ts` — 認証・リクエスト・エラーハンドリング

### ステップ 4: 各ワークフローツール実装
`lib/mcp/tools/` — 6つのワークフロー操作ツール

### ステップ 5: Vercel デプロイ & テスト
GitHub push → Vercel デプロイ → Claude.ai から接続テスト

### ステップ 6: SKILL.md 作成
MCP の使い方をスキルとして定義

---

## 付録 A: HubSpot ワークフロー アクションタイプ ID 一覧

| アクションタイプ | actionTypeId |
|---|---|
| Delay (遅延) | 0-1 |
| Send email (メール送信) | 0-4 |
| Send internal notification (内部通知) | 0-9 |
| Add to static list (リスト追加) | 0-13 |
| Create record (レコード作成) | 0-14 |

※ 完全な一覧は `GET /automation/v4/flows/{flowId}` のレスポンスから確認可能

## 付録 B: HubSpot オブジェクトタイプ ID 対応表

| オブジェクト | objectTypeId |
|---|---|
| コンタクト | 0-1 |
| 会社 | 0-2 |
| 取引 (Deal) | 0-3 |
| チケット | 0-5 |

## 付録 C: 環境変数一覧

| 変数名 | 説明 | 必須 |
|---|---|---|
| `HUBSPOT_ACCESS_TOKEN` | HubSpot Private App の Bearer トークン | ✅ |
| `MCP_API_KEY` | MCP エンドポイントの認証キー (Phase 1) | ✅ |

## 付録 D: 主要依存パッケージ

```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "mcp-handler": "^1.0.7",
    "@modelcontextprotocol/sdk": "^1.25.2",
    "zod": "^3"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^22",
    "@types/react": "^19"
  }
}
```
