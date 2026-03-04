/**
 * リクエストスコープの認証コンテキスト
 *
 * AsyncLocalStorage を使って、リクエストごとの認証情報を
 * ツールハンドラーまで伝播する。
 *
 * AUTH_MODE による分岐:
 *  - "hubspot_token" (デフォルト): Bearer Token に HubSpot アクセストークンを直接渡す
 *  - "api_key": MCP_API_KEY で MCPサーバーへの認証 + 環境変数の HubSpot トークンを使用
 */

import { AsyncLocalStorage } from "node:async_hooks";

// ── 認証モード定義 ──

export type AuthMode = "hubspot_token" | "api_key";

export function getAuthMode(): AuthMode {
  const mode = process.env.AUTH_MODE?.toLowerCase() || "hubspot_token";
  if (mode === "api_key") return "api_key";
  return "hubspot_token";
}

// ── AsyncLocalStorage ──

interface AuthContext {
  hubspotAccessToken?: string;
}

export const authStorage = new AsyncLocalStorage<AuthContext>();

/**
 * 現在のリクエストスコープから HubSpot Access Token を取得する。
 *
 * AUTH_MODE に応じて取得元が変わる:
 *  - hubspot_token: Bearer Token のみ（必須）
 *  - api_key: 環境変数 HUBSPOT_ACCESS_TOKEN（必須）
 */
export function getHubSpotToken(): string {
  const mode = getAuthMode();

  if (mode === "api_key") {
    // api_key モード: 環境変数から固定トークンを使用
    const envToken = process.env.HUBSPOT_ACCESS_TOKEN;
    if (!envToken) {
      throw new Error(
        "HUBSPOT_ACCESS_TOKEN 環境変数が設定されていません。" +
          "AUTH_MODE=api_key では HUBSPOT_ACCESS_TOKEN の設定が必須です。"
      );
    }
    return envToken;
  }

  // hubspot_token モード: Bearer Token から取得
  const ctx = authStorage.getStore();
  if (ctx?.hubspotAccessToken) {
    return ctx.hubspotAccessToken;
  }

  throw new Error(
    "HubSpot Access Token が見つかりません。" +
      "MCP クライアントの設定で Authorization: Bearer <your-hubspot-private-app-token> " +
      "ヘッダーを指定してください。" +
      "トークンは HubSpot > 設定 > 連携 > 非公開アプリ から作成できます。"
  );
}
