import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmDelete } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerCompanyDelete(server: McpServer) {
  server.tool(
    "company_delete",
    `HubSpot 会社を削除する（ゴミ箱へ移動）。confirm=trueが必須。アーカイブされ、一定期間はゴミ箱から復元可能。`,
    {
      companyId: z.string().describe("会社 ID"),
      confirm: z.literal(true).describe("削除確認（true を指定）"),
    },
    async ({ companyId }) => {
      try {
        await crmDelete("companies", companyId);
        return { content: [{ type: "text" as const, text: `会社 ${companyId} を削除しました（ゴミ箱へ移動）。` }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
