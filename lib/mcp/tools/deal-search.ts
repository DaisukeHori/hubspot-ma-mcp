import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmSearch } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerDealSearch(server: McpServer) {
  server.tool(
    "deal_search",
    "HubSpot 取引（Deal）を検索する。",
    {
      query: z.string().optional().describe("検索キーワード"),
      filterGroups: z
        .array(z.object({ filters: z.array(z.object({ propertyName: z.string(), operator: z.string(), value: z.string().optional() })) }))
        .optional(),
      properties: z.array(z.string()).optional(),
      limit: z.number().min(1).max(100).optional(),
      after: z.string().optional(),
    },
    async ({ query, filterGroups, properties, limit, after }) => {
      try {
        const defaultProps = properties ?? [
          "dealname", "amount", "dealstage", "pipeline", "closedate",
          "hubspot_owner_id", "createdate",
        ];
        const result = await crmSearch("deals", query ?? "", defaultProps, filterGroups, limit ?? 10, after);
        return { content: [{ type: "text" as const, text: JSON.stringify({ total: result.total, count: result.results.length, paging: result.paging, results: result.results }, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
