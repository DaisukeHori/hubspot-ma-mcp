import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getHubSpotToken } from "@/lib/hubspot/auth-context";
import { HubSpotError } from "@/lib/hubspot/errors";

const BASE_URL = "https://api.hubapi.com";

function getHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getHubSpotToken()}`, "Content-Type": "application/json" };
}

export function registerListDelete(server: McpServer) {
  server.tool(
    "list_delete",
    `HubSpot リスト（セグメント）を削除する。confirm=trueが必須。

削除後90日以内であればlist_restore（PUT /crm/v3/lists/{listId}/restore）で復元可能。
90日を超えると完全削除される。リスト内のレコード自体は削除されない。`,
    {
      listId: z.string().describe("ILS List ID（数値文字列）"),
      confirm: z.literal(true).describe("削除確認（true を指定）"),
    },
    async ({ listId }) => {
      try {
        const response = await fetch(`${BASE_URL}/crm/v3/lists/${listId}`, {
          method: "DELETE", headers: getHeaders(),
        });
        if (!response.ok) {
          let message = response.statusText;
          try { const body = await response.json(); message = body.message || JSON.stringify(body); } catch { /* ignore */ }
          throw new HubSpotError(response.status, message);
        }
        return { content: [{ type: "text" as const, text: `リスト ${listId} を削除しました。90日以内であれば復元可能です。` }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
