import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmCreate } from "../../hubspot/crm-client";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerProductCreate(server: McpServer) {
  server.tool(
    "product_create",
    `HubSpot に新しい商品（Product）を作成する。nameは必須。商品ライブラリに追加され、明細行（Line Item）から参照可能。

返却: 作成された商品のID, プロパティ, URL。`,
    {
      name: z.string().describe("商品名（必須。例: 'カットメニュー A'）"),
      price: z.string().optional().describe("価格（文字列。例: '5500'）"),
      description: z.string().optional().describe("商品の説明テキスト"),
      hs_sku: z.string().optional().describe("SKU（在庫管理コード。例: 'CUT-A-001'）"),
      hs_cost_of_goods_sold: z.string().optional().describe("原価（文字列。例: '2000'）"),
      hs_recurring_billing_period: z.string().optional().describe("請求周期（例: P12M）"),
      additionalProperties: z.record(z.string()).optional().describe("追加プロパティ（キー:値）。カスタムプロパティ名はproperties_listツールで確認可能"),
    
      pretty: prettyParam,
},
    async ({ name, price, description, hs_sku, hs_cost_of_goods_sold, hs_recurring_billing_period, additionalProperties, pretty }) => {
      const properties: Record<string, string> = { name };
      if (price) properties.price = price;
      if (description) properties.description = description;
      if (hs_sku) properties.hs_sku = hs_sku;
      if (hs_cost_of_goods_sold) properties.hs_cost_of_goods_sold = hs_cost_of_goods_sold;
      if (hs_recurring_billing_period) properties.hs_recurring_billing_period = hs_recurring_billing_period;
      if (additionalProperties) Object.assign(properties, additionalProperties);

      const result = await crmCreate("products", properties);
      return { content: [{ type: "text", text: formatToolResult(result, pretty) }] };
    }
  );
}
