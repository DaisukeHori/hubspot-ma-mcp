import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmGet } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerDealGet(server: McpServer) {
  server.tool(
    "deal_get",
    "HubSpot 取引（Deal）を ID で取得する。",
    {
      dealId: z.string().describe("取引 ID"),
      properties: z.array(z.string()).optional(),
      associations: z.array(z.string()).optional().describe("関連オブジェクト（contacts, companies）"),
    },
    async ({ dealId, properties, associations }) => {
      try {
        const defaultProps = properties ?? [
          "dealname", "amount", "dealstage", "pipeline", "closedate",
          "hubspot_owner_id", "description", "createdate", "lastmodifieddate",
        ];
        const result = await crmGet("deals", dealId, defaultProps, associations);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
