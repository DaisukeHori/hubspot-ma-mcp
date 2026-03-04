import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmDelete } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerDealDelete(server: McpServer) {
  server.tool(
    "deal_delete",
    `HubSpot 取引を削除する（ゴミ箱へ移動）。confirm=trueが必須。アーカイブされ、一定期間はゴミ箱から復元可能。`,
    {
      dealId: z.string().describe("取引 ID"),
      confirm: z.literal(true).describe("削除確認（true を指定）"),
    },
    async ({ dealId }) => {
      try {
        await crmDelete("deals", dealId);
        return { content: [{ type: "text" as const, text: `取引 ${dealId} を削除しました（ゴミ箱へ移動）。` }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
