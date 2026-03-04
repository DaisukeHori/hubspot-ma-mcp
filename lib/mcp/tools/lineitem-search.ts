import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmSearch } from "../../hubspot/crm-client";

const DEFAULT_PROPS = ["name", "quantity", "price", "amount", "hs_product_id", "description", "hs_recurring_billing_period", "createdate"];

export function registerLineItemSearch(server: McpServer) {
  server.tool(
    "lineitem_search",
    `HubSpot 明細行（Line Item）を検索する。キーワード検索またはフィルター条件で絞り込み可能。

返却: 一致する明細行の配列（ID, プロパティ, 作成日, 更新日）。totalで総件数も返る。
ページネーション: afterに前回レスポンスのカーソルを指定して次ページ取得。`,
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
      const result = await crmSearch("line_items", query || "", properties || DEFAULT_PROPS, filterGroups, limit || 10, after);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
