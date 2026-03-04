import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmDelete } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerContactDelete(server: McpServer) {
  server.tool(
    "contact_delete",
    "HubSpot コンタクトを削除する（ゴミ箱へ移動）。復元可能。",
    {
      contactId: z.string().describe("コンタクト ID"),
      confirm: z.literal(true).describe("削除確認（true を指定）"),
    },
    async ({ contactId }) => {
      try {
        await crmDelete("contacts", contactId);
        return { content: [{ type: "text" as const, text: `コンタクト ${contactId} を削除しました（ゴミ箱へ移動）。` }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
