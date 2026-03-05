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
  return { Authorization: `Bearer ${getHubSpotToken()}`, "Content-Type": "application/json" };
}

export function registerMarketingEmailGet(server: McpServer) {
  server.tool(
    "marketing_email_get",
    `HubSpot マーケティングメールの詳細を1件取得する。メール本文（content/widgets）、送信設定、配信リスト、テンプレート情報等の完全な定義が返る。

返却: id, name, subject, state（DRAFT/PUBLISHED/SENT等）, type, from, to（配信対象リスト）, content（メール本文widget構造）, configuration, publishDate, stats（includeStats=true時）。
既存メールの構造を確認してcloneする際の参照に使用。`,
    {
      emailId: z.string().describe("マーケティングメールID（数値文字列）。marketing_email_listの返却値のidフィールドから取得"),
      includeStats: z.boolean().optional().describe("送信統計を含めるか（デフォルト false）"),
    },
    async ({ emailId, includeStats }) => {
      try {
        const params = new URLSearchParams();
        if (includeStats) params.set("includeStats", "true");
        const qs = params.toString() ? `?${params.toString()}` : "";

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/emails/${emailId}${qs}`,
          { method: "GET", headers: getHeaders() }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
