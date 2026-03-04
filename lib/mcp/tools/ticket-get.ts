import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmGet } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerTicketGet(server: McpServer) {
  server.tool(
    "ticket_get",
    "HubSpot チケットの詳細を取得する。関連レコードの取得も可能。",
    {
      ticketId: z.string().describe("チケット ID"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列"),
      associations: z.array(z.string()).optional().describe("取得する関連オブジェクト（contacts, companies, deals 等）"),
    },
    async ({ ticketId, properties, associations }) => {
      try {
        const defaultProps = properties ?? [
          "subject", "content", "hs_pipeline", "hs_pipeline_stage",
          "hs_ticket_priority", "createdate", "hs_lastmodifieddate",
          "hubspot_owner_id",
        ];
        const result = await crmGet("tickets", ticketId, defaultProps, associations);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
