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
  return { Authorization: `Bearer ${getHubSpotToken()}`, "Content-Type": "application/json" };
}

export function registerMarketingEmailClone(server: McpServer) {
  server.tool(
    "marketing_email_clone",
    `HubSpot マーケティングメールを複製する。既存メールのデザイン・本文・設定を引き継いだDRAFTコピーを作成。

用途: 過去のキャンペーンメールをテンプレートとして再利用する場合に最適。
複製後はmarketing_email_updateで件名・本文・配信先を変更し、publishで送信。
返却: 複製されたメールのid, name(末尾に" (copy)"付き), state(DRAFT)。`,
    {
      emailId: z.string().describe("複製元のマーケティングメールID（数値文字列）"),
      name: z.string().optional().describe("複製後のメール名（省略時は元の名前に' (copy)'が付く）"),
    
      pretty: prettyParam,
},
    async ({ emailId, name, pretty }) => {
      try {
        const body: Record<string, unknown> = {};
        if (name) body.name = name;

        const result = await fetchJson<Record<string, unknown>>(
          `${BASE_URL}/marketing/v3/emails/${emailId}/clone`,
          { method: "POST", headers: getHeaders(), body: JSON.stringify(body) }
        );
        return { content: [{ type: "text" as const, text: formatToolResult(result, pretty) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
