import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmCreate } from "../../hubspot/crm-client";

export function registerProductCreate(server: McpServer) {
  server.tool(
    "product_create",
    "商品ライブラリに商品を登録する",
    {
      name: z.string().describe("商品名"),
      price: z.string().optional().describe("価格"),
      description: z.string().optional().describe("説明"),
      hs_sku: z.string().optional().describe("SKU"),
      hs_cost_of_goods_sold: z.string().optional().describe("原価"),
      hs_recurring_billing_period: z.string().optional().describe("請求周期（例: P12M）"),
      additionalProperties: z.record(z.string()).optional().describe("追加プロパティ"),
    },
    async ({ name, price, description, hs_sku, hs_cost_of_goods_sold, hs_recurring_billing_period, additionalProperties }) => {
      const properties: Record<string, string> = { name };
      if (price) properties.price = price;
      if (description) properties.description = description;
      if (hs_sku) properties.hs_sku = hs_sku;
      if (hs_cost_of_goods_sold) properties.hs_cost_of_goods_sold = hs_cost_of_goods_sold;
      if (hs_recurring_billing_period) properties.hs_recurring_billing_period = hs_recurring_billing_period;
      if (additionalProperties) Object.assign(properties, additionalProperties);

      const result = await crmCreate("products", properties);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
