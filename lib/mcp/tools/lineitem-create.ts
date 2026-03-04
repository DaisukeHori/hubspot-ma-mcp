import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmCreate } from "../../hubspot/crm-client";

export function registerLineItemCreate(server: McpServer) {
  server.tool(
    "lineitem_create",
    "Line Item（明細行）を新規作成し、取引に紐付ける",
    {
      name: z.string().describe("明細行の名前"),
      quantity: z.string().optional().describe("数量"),
      price: z.string().optional().describe("単価"),
      hs_product_id: z.string().optional().describe("商品 ID（商品ライブラリから紐付け）"),
      description: z.string().optional().describe("説明"),
      dealId: z.string().optional().describe("紐付ける取引 ID"),
      additionalProperties: z.record(z.string()).optional().describe("追加プロパティ"),
    },
    async ({ name, quantity, price, hs_product_id, description, dealId, additionalProperties }) => {
      const properties: Record<string, string> = { name };
      if (quantity) properties.quantity = quantity;
      if (price) properties.price = price;
      if (hs_product_id) properties.hs_product_id = hs_product_id;
      if (description) properties.description = description;
      if (additionalProperties) Object.assign(properties, additionalProperties);

      const associations = dealId ? [{
        to: { id: dealId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 20 }],
      }] : undefined;

      const result = await crmCreate("line_items", properties, associations);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
