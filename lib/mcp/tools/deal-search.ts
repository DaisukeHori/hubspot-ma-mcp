import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmSearch } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerDealSearch(server: McpServer) {
  server.tool(
    "deal_search",
    `HubSpot 取引（Deal）を検索する。キーワード検索またはフィルター条件で絞り込み可能。

返却: 一致する取引の配列（ID, プロパティ, 作成日, 更新日）。totalで総件数も返る。制約: 最大5 filterGroups×各6 filters（合計18 filters）、総結果上限10,000件。
ページネーション: afterに前回レスポンスのカーソルを指定して次ページ取得。`,
    {
      query: z.string().optional().describe("フリーテキスト検索キーワード。取引名等の主要フィールドを横断検索。filterGroupsと併用可能"),
      filterGroups: z
        .array(z.object({ filters: z.array(z.object({ propertyName: z.string().describe("フィルタ対象プロパティ名（例: dealname, amount, dealstage）"), operator: z.string().describe("比較演算子: EQ, NEQ, LT, LTE, GT, GTE, CONTAINS_TOKEN, HAS_PROPERTY, NOT_HAS_PROPERTY, IN, NOT_IN, BETWEEN"), value: z.string().optional().describe("比較値（EQ/NEQ/LT/GT等で使用）"), values: z.array(z.string()).optional().describe("値の配列（IN/NOT_IN演算子用。値は小文字必須）"), highValue: z.string().optional().describe("範囲上限値（BETWEEN演算子用。valueが下限、highValueが上限）") })).describe("AND条件フィルタの配列") }))
        .optional().describe("高度なフィルター条件。例: [{filters:[{propertyName:'amount',operator:'GT',value:'100000'}]}]。operator: EQ, NEQ, LT, GT, GTE, LTE, CONTAINS_TOKEN 等"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列（例: ['dealname','amount','dealstage','closedate']）。省略時はデフォルトプロパティのみ"),
      limit: z.number().min(1).max(200).optional().describe("取得件数（デフォルト10、最大200）"),
      sorts: z.array(z.object({
        propertyName: z.string().describe("ソート対象プロパティ名（例: createdate, lastmodifieddate）"),
        direction: z.enum(["ASCENDING", "DESCENDING"]).describe("ソート方向: ASCENDING（昇順）/ DESCENDING（降順）"),
      })).optional().describe("ソート条件（1つのみ指定可能）。省略時はcreatedate昇順"),
      after: z.string().optional().describe("ページネーション用カーソル（前回レスポンスのpaging.next.afterの値）"),
    },
    async ({ query, filterGroups, properties, limit, after, sorts }) => {
      try {
        const defaultProps = properties ?? [
          "dealname", "amount", "dealstage", "pipeline", "closedate",
          "hubspot_owner_id", "createdate",
        ];
        const result = await crmSearch("deals", query ?? "", defaultProps, filterGroups, limit ?? 10, after, sorts);
        return { content: [{ type: "text" as const, text: JSON.stringify({ total: result.total, count: result.results.length, paging: result.paging, results: result.results }, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
