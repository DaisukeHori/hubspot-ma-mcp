import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";

const BASE_URL = "https://api.hubapi.com";

async function fetchJson<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = response.statusText;
    try { const body = await response.json(); message = body.message || JSON.stringify(body); } catch { /* ignore */ }
    throw new HubSpotError(response.status, message);
  }
  return response.json() as Promise<T>;
}

function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getHubSpotToken()}`,
    "Content-Type": "application/json",
  };
}

export function registerFormGet(server: McpServer) {
  server.tool(
    "form_get",
    `HubSpot フォームの詳細定義を1件取得する。フィールド構成（fieldGroups）、送信設定、スタイル、リダイレクト先等の完全な定義が返る。

返却: id, name, formType, fieldGroups（フィールド定義の配列）, configuration（送信後アクション、言語設定等）, displayOptions（スタイル設定）, legalConsentOptions（GDPR同意設定）。
フォームの埋め込みコードやフィールド一覧の確認に使用。`,
    {
      formId: z.string().describe("フォームID（UUID形式）。form_listの返却値のidフィールドから取得"),
      archived: z.boolean().optional().describe("アーカイブ済みフォームを取得するか（デフォルト false）"),
    },
    async ({ formId, archived }) => {
      try {
        const params = new URLSearchParams();
        if (archived !== undefined) params.set("archived", String(archived));
        const qs = params.toString() ? `?${params.toString()}` : "";

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/forms/${formId}${qs}`,
          { method: "GET", headers: getHeaders() }
        );

        // インデント整形を削除してレスポンスサイズを20-40%削減。
        // Claude.ai (web/desktop) の MCP 接続層は ~50KB 超のペイロードで intermittently
        // "Tool result could not be submitted" エラーを起こす既知のバグがある
        // (anthropics/claude-ai-mcp Issue #211)。
        // form_get は fieldGroups + 選択肢 + style 設定で容易に 50KB を超えるため、
        // インデント削除でサイズを抑える。LLM側はJSON構造として解釈するため、
        // インデント有無による可読性への影響は無視できる。
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (error) {
        const message = error instanceof HubSpotError
          ? `HubSpot API エラー (${error.status}): ${error.message}`
          : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
