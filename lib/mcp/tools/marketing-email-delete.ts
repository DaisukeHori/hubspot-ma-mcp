import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";

const BASE_URL = "https://api.hubapi.com";

function getHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getHubSpotToken()}`, "Content-Type": "application/json" };
}

export function registerMarketingEmailDelete(server: McpServer) {
  server.tool(
    "marketing_email_delete",
    `HubSpot マーケティングメールを削除（アーカイブ）する。confirm=trueが必須。

アーカイブされたメールはarchived=trueで取得可能。送信済みメールの統計データは保持される。`,
    {
      emailId: z.string().describe("マーケティングメールID（数値文字列）"),
      confirm: z.literal(true).describe("削除確認（true を指定）"),
    },
    async ({ emailId }) => {
      try {
        const response = await fetch(`${BASE_URL}/marketing/v3/emails/${emailId}`, {
          method: "DELETE", headers: getHeaders(),
        });
        if (!response.ok) {
          let message = response.statusText;
          try { const body = await response.json(); message = body.message || JSON.stringify(body); } catch { /* ignore */ }
          throw new HubSpotError(message, response.status);
        }
        return { content: [{ type: "text" as const, text: `マーケティングメール ${emailId} をアーカイブしました。` }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
