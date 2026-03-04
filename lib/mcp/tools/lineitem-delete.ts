import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmDelete } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerLineItemDelete(server: McpServer) {
  server.tool(
    "lineitem_delete",
    `HubSpot 明細行を削除する。confirm=trueが必須。関連する取引からも自動的に解除される。`,
    {
      lineItemId: z.string().describe("明細行 ID"),
      confirm: z.literal(true).describe("削除確認（true を指定）"),
    },
    async ({ lineItemId }) => {
      try {
        await crmDelete("line_items", lineItemId);
        return { content: [{ type: "text" as const, text: `明細行 ${lineItemId} を削除しました。` }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
