import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmSearch } from "../../hubspot/crm-client";

const DEFAULT_PROPS = ["name", "description", "price", "hs_cost_of_goods_sold", "hs_recurring_billing_period", "hs_sku", "createdate"];

export function registerProductSearch(server: McpServer) {
  server.tool(
    "product_search",
    "商品ライブラリ（Products）を検索する",
    {
      query: z.string().optional().describe("検索キーワード"),
      filterGroups: z.array(z.object({
        filters: z.array(z.object({
          propertyName: z.string(),
          operator: z.string(),
          value: z.string().optional(),
        })),
      })).optional().describe("フィルター条件"),
      properties: z.array(z.string()).optional().describe("取得プロパティ"),
      limit: z.number().optional().describe("件数（最大100）"),
      after: z.string().optional().describe("ページネーション"),
    },
    async ({ query, filterGroups, properties, limit, after }) => {
      const result = await crmSearch("products", query || "", properties || DEFAULT_PROPS, filterGroups, limit || 10, after);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
