import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmUpdate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerProductUpdate(server: McpServer) {
  server.tool(
    "product_update",
    "HubSpot 商品を更新する。名前・価格・SKU 等を変更可能。",
    {
      productId: z.string().describe("商品 ID"),
      properties: z.record(z.string()).describe("更新するプロパティ（キー:値）"),
    },
    async ({ productId, properties }) => {
      try {
        const result = await crmUpdate("products", productId, properties);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
