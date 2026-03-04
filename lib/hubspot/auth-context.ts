/**
 * リクエストスコープの認証コンテキスト
 *
 * AsyncLocalStorage を使って、リクエストごとの HubSpot Access Token を
 * ツールハンドラーまで伝播する。
 *
 * Bearer Token 必須:
 *  - リクエストの Authorization: Bearer ヘッダーでトークンを指定
 *  - 環境変数フォールバックは無効（公開サーバー保護のため）
 */

import { AsyncLocalStorage } from "node:async_hooks";

interface AuthContext {
  hubspotAccessToken: string;
}

export const authStorage = new AsyncLocalStorage<AuthContext>();

/**
 * 現在のリクエストスコープから HubSpot Access Token を取得する。
 * Bearer Token が必須。環境変数へのフォールバックは行わない。
 */
export function getHubSpotToken(): string {
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
