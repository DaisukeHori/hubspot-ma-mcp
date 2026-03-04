/**
 * MCP エンドポイント
 *
 * /api/mcp  → Streamable HTTP (メイン)
 * /api/sse  → SSE (後方互換)
 *
 * AUTH_MODE による認証分岐:
 *  - "hubspot_token" (デフォルト):
 *      トークン渡し方（優先順）:
 *        1. Authorization: Bearer <HubSpot PAT>
 *        2. URL クエリ ?token=<HubSpot PAT>（Claude.ai Web等ヘッダー設定不可のクライアント用）
 *      MCPサーバー自体への認証はなし
 *
 *  - "api_key":
 *      APIキー渡し方（優先順）:
 *        1. Authorization: Bearer <MCP_API_KEY>
 *        2. URL クエリ ?key=<MCP_API_KEY>
 *      HubSpotトークンは環境変数 HUBSPOT_ACCESS_TOKEN を使用（組織固定）
 */

import { createMcpHandler } from "mcp-handler";
import { registerAllTools } from "@/lib/mcp/server";
import { authStorage, getAuthMode } from "@/lib/hubspot/auth-context";

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
 * Bearer Token を Authorization ヘッダーから抽出する
 */
function extractBearerToken(request: Request): string | undefined {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || undefined;
}

/**
 * URL クエリパラメータからトークンを抽出する
 * Claude.ai Web 等、カスタムヘッダーを設定できないクライアント向け
 *
 * - hubspot_token モード: ?token=<HubSpot PAT>
 * - api_key モード: ?key=<MCP_API_KEY>
 */
function extractQueryToken(request: Request, param: string): string | undefined {
  try {
    const url = new URL(request.url);
    return url.searchParams.get(param) || undefined;
  } catch {
    return undefined;
  }
}

/**
 * api_key モード: MCP_API_KEY で認証
 * 一致しなければ 401 を返す
 */
function verifyApiKey(apiKey: string | undefined): Response | null {
  const expectedKey = process.env.MCP_API_KEY;

  if (!expectedKey) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message:
            "サーバー設定エラー: AUTH_MODE=api_key ですが MCP_API_KEY が設定されていません。",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!apiKey || apiKey !== expectedKey) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message:
            "認証エラー: 有効な API キーを Authorization: Bearer <MCP_API_KEY> または ?key=<MCP_API_KEY> で指定してください。",
        },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  return null; // 認証OK
}

/**
 * メインハンドラー
 */
async function handler(request: Request): Promise<Response> {
  const mode = getAuthMode();
  const bearerToken = extractBearerToken(request);

  if (mode === "api_key") {
    // ── api_key モード ──
    // Bearer Token or ?key= で MCP_API_KEY を検証
    const apiKey = bearerToken || extractQueryToken(request, "key");
    const errorResponse = verifyApiKey(apiKey);
    if (errorResponse) return errorResponse;

    // HubSpot トークンは環境変数から取得されるので
    // AsyncLocalStorage にはセットしない
    return mcpHandler(request);
  }

  // ── hubspot_token モード（デフォルト） ──
  // Bearer Token or ?token= で HubSpot アクセストークンを取得
  const hubspotToken = bearerToken || extractQueryToken(request, "token");

  if (hubspotToken) {
    return authStorage.run(
      { hubspotAccessToken: hubspotToken },
      () => mcpHandler(request)
    );
  }

  // トークンがない場合はそのまま実行
  // （getHubSpotToken() でエラーになる）
  return mcpHandler(request);
}

export { handler as GET, handler as POST };
