import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";

const BASE_URL = "https://api.hubapi.com";

function getHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getHubSpotToken()}`,
    "Content-Type": "application/json",
  };
}

export function registerFormDelete(server: McpServer) {
  server.tool(
    "form_delete",
    `HubSpot フォームをアーカイブ（論理削除）する。confirm=trueが必須。

アーカイブされたフォームはHubSpot UI上で非表示になるが、archived=trueで取得可能。
フォームに関連付けられた既存の送信データは保持される。`,
    {
      formId: z.string().describe("フォームID（UUID形式）。form_listの返却値のidフィールドから取得"),
      confirm: z.literal(true).describe("削除確認（true を指定）"),
    },
    async ({ formId }) => {
      try {
        const response = await fetch(
          `${BASE_URL}/marketing/v3/forms/${formId}`,
          { method: "DELETE", headers: getHeaders() }
        );
        if (!response.ok) {
          let message = response.statusText;
          try { const body = await response.json(); message = body.message || JSON.stringify(body); } catch { /* ignore */ }
          throw new HubSpotError(response.status, message);
        }
        return {
          content: [{ type: "text" as const, text: `フォーム ${formId} をアーカイブしました。` }],
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
