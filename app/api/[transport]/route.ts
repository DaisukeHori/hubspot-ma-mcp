/**
 * MCP エンドポイント
 *
 * /api/mcp  → Streamable HTTP (メイン)
 * /api/sse  → SSE (後方互換)
 *
 * 認証方式（両対応）:
 *  1. Authorization: Bearer <HubSpot PAT>  → ユーザー自身のトークン
 *  2. 環境変数 HUBSPOT_ACCESS_TOKEN        → サーバーデフォルト
 */

import { createMcpHandler } from "mcp-handler";
import { registerAllTools } from "@/lib/mcp/server";
import { authStorage } from "@/lib/hubspot/auth-context";

const mcpHandler = createMcpHandler(
  (server) => {
    registerAllTools(server);
  },
  {},
  {
    basePath: "/api",
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV === "development",
  }
);

/**
 * リクエストの Authorization ヘッダーから Bearer トークンを抽出し、
 * AsyncLocalStorage 経由でツールハンドラーに渡すラッパー。
 *
 * createMcpHandler は (request: Request) => Promise<Response> を返すため
 * 引数は request のみ。
 */
async function handler(request: Request): Promise<Response> {
  // Authorization: Bearer xxx からトークンを抽出
  const authHeader = request.headers.get("authorization") || "";
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const bearerToken = bearerMatch?.[1] || undefined;

  // AsyncLocalStorage にトークンをセットしてハンドラーを実行
  if (bearerToken) {
    return authStorage.run(
      { hubspotAccessToken: bearerToken },
      () => mcpHandler(request)
    );
  }

  // Bearer Token がない場合はそのまま実行（環境変数フォールバック）
  return mcpHandler(request);
}

export { handler as GET, handler as POST };
