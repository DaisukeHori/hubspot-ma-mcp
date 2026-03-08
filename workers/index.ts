/**
 * Cloudflare Workers 用 MCP エントリーポイント
 *
 * Vercel 版 (app/api/[transport]/route.ts) と同じ lib/ を共有し、
 * Cloudflare Workers 上で MCP サーバーを提供する。
 *
 * 認証は Vercel 版と完全互換:
 *  - "hubspot_token" (デフォルト): Bearer <HubSpot PAT> or ?token=<PAT>
 *  - "api_key": Bearer <MCP_API_KEY> or ?key=<KEY>
 *
 * デプロイ: wrangler deploy
 * ローカル: wrangler dev
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler } from "agents/mcp";
import { registerAllTools } from "@/lib/mcp/server";
import { authStorage, getAuthMode } from "@/lib/hubspot/auth-context";

// ── Cloudflare Workers 環境変数の型定義 ──

interface Env {
  AUTH_MODE?: string;
  MCP_API_KEY?: string;
  HUBSPOT_ACCESS_TOKEN?: string;
}

// ── process.env ブリッジ ──
// 共有 lib/ は process.env を参照するため、
// Cloudflare の env バインディングを process.env に橋渡しする。

function bridgeEnv(env: Env): void {
  if (env.AUTH_MODE !== undefined) process.env.AUTH_MODE = env.AUTH_MODE;
  if (env.MCP_API_KEY !== undefined) process.env.MCP_API_KEY = env.MCP_API_KEY;
  if (env.HUBSPOT_ACCESS_TOKEN !== undefined)
    process.env.HUBSPOT_ACCESS_TOKEN = env.HUBSPOT_ACCESS_TOKEN;
  // NODE_ENV は wrangler が自動で define するため設定不要
}

// ── 認証ヘルパー (Vercel 版 route.ts と同一ロジック) ──

function extractBearerToken(request: Request): string | undefined {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || undefined;
}

function extractQueryToken(
  request: Request,
  param: string
): string | undefined {
  try {
    const url = new URL(request.url);
    return url.searchParams.get(param) || undefined;
  } catch {
    return undefined;
  }
}

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

// ── メイン Worker ──

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // ① Cloudflare env → process.env ブリッジ
    bridgeEnv(env);

    // ② MCP SDK 1.26+ 対応: リクエストごとに新しい McpServer を生成
    //    (同じインスタンスを再利用すると "Server is already connected" エラー)
    const server = new McpServer({
      name: "hubspot-ma-mcp",
      version: "1.0.0",
    });
    registerAllTools(server);

    const mcpHandler = createMcpHandler(server, { route: "/mcp" });

    // ③ 認証処理
    const mode = getAuthMode();
    const bearerToken = extractBearerToken(request);

    if (mode === "api_key") {
      // api_key モード: MCP_API_KEY で認証
      const apiKey = bearerToken || extractQueryToken(request, "key");
      const errorResponse = verifyApiKey(apiKey);
      if (errorResponse) return errorResponse;
      return mcpHandler(request, env, ctx);
    }

    // hubspot_token モード（デフォルト）: Bearer Token で HubSpot PAT を受け取る
    const hubspotToken = bearerToken || extractQueryToken(request, "token");

    if (hubspotToken) {
      return authStorage.run({ hubspotAccessToken: hubspotToken }, () =>
        mcpHandler(request, env, ctx)
      );
    }

    // トークンなし → そのまま実行（getHubSpotToken() でエラーになる）
    return mcpHandler(request, env, ctx);
  },
};
