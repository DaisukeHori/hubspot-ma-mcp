import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmSearch } from "../../hubspot/crm-client";

const DEFAULT_PROPS = ["name", "description", "price", "hs_cost_of_goods_sold", "hs_recurring_billing_period", "hs_sku", "createdate"];

export function registerProductSearch(server: McpServer) {
  server.tool(
    "product_search",
    `HubSpot 商品（Product）を検索する。キーワード検索またはフィルター条件で絞り込み可能。

返却: 一致する商品の配列（ID, プロパティ, 作成日, 更新日）。totalで総件数も返る。
ページネーション: afterに前回レスポンスのカーソルを指定して次ページ取得。`,
    {
      query: z.string().optional().describe("フリーテキスト検索キーワード。商品名等を横断検索"),
      filterGroups: z.array(z.object({
        filters: z.array(z.object({
          propertyName: z.string().describe("フィルタ対象プロパティ名（例: name, price, hs_sku, description）"),
          operator: z.string().describe("比較演算子: EQ, NEQ, LT, LTE, GT, GTE, CONTAINS_TOKEN, HAS_PROPERTY, NOT_HAS_PROPERTY"),
          value: z.string().optional(),
        })),
      })).optional().describe("フィルター条件"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列（例: ['name','price']）。省略時はデフォルトプロパティのみ"),
      limit: z.number().optional().describe("取得件数（デフォルト10、最大100）"),
      after: z.string().optional().describe("ページネーション"),
    },
    async ({ query, filterGroups, properties, limit, after }) => {
      const result = await crmSearch("products", query || "", properties || DEFAULT_PROPS, filterGroups, limit || 10, after);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
