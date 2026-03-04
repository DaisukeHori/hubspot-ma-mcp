import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmDelete } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerTicketDelete(server: McpServer) {
  server.tool(
    "ticket_delete",
    "HubSpot チケットを削除する（ゴミ箱へ移動）。復元可能。",
    {
      ticketId: z.string().describe("チケット ID"),
      confirm: z.literal(true).describe("削除確認（true を指定）"),
    },
    async ({ ticketId }) => {
      try {
        await crmDelete("tickets", ticketId);
        return { content: [{ type: "text" as const, text: `チケット ${ticketId} を削除しました（ゴミ箱へ移動）。` }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
