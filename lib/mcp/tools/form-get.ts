import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

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
フォームの埋め込みコードやフィールド一覧の確認に使用。

【サイズに関する注意】
fieldGroups + 選択肢 + style 設定で容易に 50KB を超えるフォームがあり、
Claude.ai では大きなレスポンスで 'Tool result could not be submitted' エラーが
intermittently 発生する場合がある（anthropics/claude-ai-mcp Issue #211）。
その場合は \`pretty: false\` を指定すると minified 形式になり、サイズ20-40%削減で回避できる場合あり。`,
    {
      formId: z.string().describe("フォームID（UUID形式）。form_listの返却値のidフィールドから取得"),
      archived: z.boolean().optional().describe("アーカイブ済みフォームを取得するか（デフォルト false）"),
      pretty: prettyParam,
    },
    async ({ formId, archived, pretty }) => {
      try {
        const params = new URLSearchParams();
        if (archived !== undefined) params.set("archived", String(archived));
        const qs = params.toString() ? `?${params.toString()}` : "";

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/forms/${formId}${qs}`,
          { method: "GET", headers: getHeaders() }
        );

        return {
          content: [{ type: "text" as const, text: formatToolResult(result, pretty) }],
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
