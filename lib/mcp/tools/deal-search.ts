import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmSearch } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerDealSearch(server: McpServer) {
  server.tool(
    "deal_search",
    `HubSpot 取引（Deal）を検索する。キーワード検索またはフィルター条件で絞り込み可能。

返却: 一致する取引の配列（ID, プロパティ, 作成日, 更新日）。totalで総件数も返る。
ページネーション: afterに前回レスポンスのカーソルを指定して次ページ取得。`,
    {
      query: z.string().optional().describe("検索キーワード"),
      filterGroups: z
        .array(z.object({ filters: z.array(z.object({ propertyName: z.string(), operator: z.string(), value: z.string().optional() })) }))
        .optional().describe("高度なフィルター条件。例: [{filters:[{propertyName:'amount',operator:'GT',value:'100000'}]}]。operator: EQ, NEQ, LT, GT, GTE, LTE, CONTAINS_TOKEN 等"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列（例: ['dealname','amount','dealstage','closedate']）。省略時はデフォルトプロパティのみ"),
      limit: z.number().min(1).max(100).optional().describe("取得件数（デフォルト10、最大100）"),
      after: z.string().optional().describe("ページネーション用カーソル（前回レスポンスのpaging.next.afterの値）"),
    },
    async ({ query, filterGroups, properties, limit, after }) => {
      try {
        const defaultProps = properties ?? [
          "dealname", "amount", "dealstage", "pipeline", "closedate",
          "hubspot_owner_id", "createdate",
        ];
        const result = await crmSearch("deals", query ?? "", defaultProps, filterGroups, limit ?? 10, after);
        return { content: [{ type: "text" as const, text: JSON.stringify({ total: result.total, count: result.results.length, paging: result.paging, results: result.results }, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
