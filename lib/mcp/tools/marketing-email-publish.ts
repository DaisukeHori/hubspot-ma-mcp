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
    throw new HubSpotError(message, response.status);
  }
  return response.json() as Promise<T>;
}

function getHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getHubSpotToken()}`, "Content-Type": "application/json" };
}

export function registerMarketingEmailPublish(server: McpServer) {
  server.tool(
    "marketing_email_publish",
    `HubSpot マーケティングメールを公開（送信）する。confirm=trueが必須。

⚠️ Marketing Hub Enterpriseまたはトランザクションメールアドオンが必要。
⚠️ 実行すると配信対象リスト全員にメールが送信される。この操作は取り消せない。
送信前にmarketing_email_getでメール内容と配信先リストを確認すること。

DRAFT状態のメールのみ送信可能。既にPUBLISHED/SENT状態のメールにはエラーが返る。`,
    {
      emailId: z.string().describe("送信するマーケティングメールID（数値文字列。DRAFT状態のみ）"),
      confirm: z.literal(true).describe("送信確認（true を指定。この操作は取り消せない）"),
    },
    async ({ emailId }) => {
      try {
        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/emails/${emailId}/publish`,
          { method: "POST", headers: getHeaders(), body: JSON.stringify({}) }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
