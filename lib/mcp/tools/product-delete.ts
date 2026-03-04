import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmDelete } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerProductDelete(server: McpServer) {
  server.tool(
    "product_delete",
    `HubSpot 商品を削除する。confirm=trueが必須。この商品を参照している明細行は影響を受ける可能性あり。`,
    {
      productId: z.string().describe("商品 ID"),
      confirm: z.literal(true).describe("削除確認（true を指定）"),
    },
    async ({ productId }) => {
      try {
        await crmDelete("products", productId);
        return { content: [{ type: "text" as const, text: `商品 ${productId} を削除しました。` }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
