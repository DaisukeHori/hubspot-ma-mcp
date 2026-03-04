import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmGet } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerProductGet(server: McpServer) {
  server.tool(
    "product_get",
    `HubSpot 商品を1件取得する。IDを指定してプロパティを取得。返却: 商品のID, 全プロパティ（またはproperties指定分）, 作成日, 更新日。`,
    {
      productId: z.string().describe("商品 ID"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列"),
    },
    async ({ productId, properties }) => {
      try {
        const defaultProps = properties ?? [
          "name", "description", "price", "hs_sku",
          "hs_cost_of_goods_sold", "hs_recurring_billing_period",
          "createdate",
        ];
        const result = await crmGet("products", productId, defaultProps);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
