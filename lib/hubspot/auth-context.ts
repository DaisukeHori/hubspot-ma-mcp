/**
 * リクエストスコープの認証コンテキスト
 *
 * AsyncLocalStorage を使って、リクエストごとの HubSpot Access Token を
 * ツールハンドラーまで伝播する。
 *
 * 優先順位:
 *  1. リクエストの Authorization: Bearer ヘッダー（ユーザー指定）
 *  2. 環境変数 HUBSPOT_ACCESS_TOKEN（サーバーデフォルト）
 */

import { AsyncLocalStorage } from "node:async_hooks";

interface AuthContext {
  hubspotAccessToken: string;
}

export const authStorage = new AsyncLocalStorage<AuthContext>();

/**
 * 現在のリクエストスコープから HubSpot Access Token を取得する。
 * AsyncLocalStorage にトークンがあればそれを、なければ環境変数を使う。
 */
export function getHubSpotToken(): string {
  const ctx = authStorage.getStore();
  if (ctx?.hubspotAccessToken) {
    return ctx.hubspotAccessToken;
  }

  const envToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (envToken) {
    return envToken;
  }

  throw new Error(
    "HubSpot Access Token が見つかりません。" +
      "MCP クライアントの設定で Authorization: Bearer ヘッダーを指定するか、" +
      "サーバーの環境変数 HUBSPOT_ACCESS_TOKEN を設定してください。"
  );
}
