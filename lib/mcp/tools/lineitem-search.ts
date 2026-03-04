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
      query: z.string().optional().describe("フリーテキスト検索キーワード。明細行名等を横断検索"),
      filterGroups: z.array(z.object({
        filters: z.array(z.object({
          propertyName: z.string().describe("フィルタ対象プロパティ名（例: name, quantity, price, hs_product_id）"),
          operator: z.string().describe("比較演算子: EQ, NEQ, LT, LTE, GT, GTE, CONTAINS_TOKEN, HAS_PROPERTY, NOT_HAS_PROPERTY"),
          value: z.string().optional().describe("比較値（EQ/NEQ/LT/GT等で使用）"),
                values: z.array(z.string()).optional().describe("値の配列（IN/NOT_IN演算子用。値は小文字必須）"),
                highValue: z.string().optional().describe("範囲上限値（BETWEEN演算子用。valueが下限、highValueが上限）"),
        })).describe("AND条件フィルタの配列"),
      })).optional().describe("高度なフィルター条件（OR条件の配列。各グループ内のfiltersはAND結合）"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列（例: ['name','quantity']）。省略時はデフォルトプロパティのみ"),
      limit: z.number().optional().describe("取得件数（デフォルト10、最大200）"),
      sorts: z.array(z.object({
        propertyName: z.string().describe("ソート対象プロパティ名（例: createdate, lastmodifieddate）"),
        direction: z.enum(["ASCENDING", "DESCENDING"]).describe("ソート方向: ASCENDING（昇順）/ DESCENDING（降順）"),
      })).optional().describe("ソート条件（1つのみ指定可能）。省略時はcreatedate昇順"),
      after: z.string().optional().describe("ページネーション"),
    },
    async ({ query, filterGroups, properties, limit, after, sorts }) => {
      const result = await crmSearch("line_items", query || "", properties || DEFAULT_PROPS, filterGroups, limit || 10, after, sorts);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
