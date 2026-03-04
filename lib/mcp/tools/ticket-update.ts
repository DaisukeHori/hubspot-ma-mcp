import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmUpdate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerTicketUpdate(server: McpServer) {
  server.tool(
    "ticket_update",
    "HubSpot チケットを更新する。ステータス・優先度・担当者等を変更可能。",
    {
      ticketId: z.string().describe("チケット ID"),
      properties: z.record(z.string()).describe("更新するプロパティ（キー:値）"),
    },
    async ({ ticketId, properties }) => {
      try {
        const result = await crmUpdate("tickets", ticketId, properties);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
