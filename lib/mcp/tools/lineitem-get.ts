import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmGet } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerLineItemGet(server: McpServer) {
  server.tool(
    "lineitem_get",
    "HubSpot 明細行の詳細を取得する。関連する取引・商品の取得も可能。",
    {
      lineItemId: z.string().describe("明細行 ID"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列"),
      associations: z.array(z.string()).optional().describe("取得する関連オブジェクト（deals, products 等）"),
    },
    async ({ lineItemId, properties, associations }) => {
      try {
        const defaultProps = properties ?? [
          "name", "quantity", "price", "amount",
          "hs_product_id", "hs_sku", "createdate",
        ];
        const result = await crmGet("line_items", lineItemId, defaultProps, associations);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
