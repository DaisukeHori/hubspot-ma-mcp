import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmSearch } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerTicketSearch(server: McpServer) {
  server.tool(
    "ticket_search",
    `HubSpot チケットを検索する。キーワード検索またはフィルター条件で絞り込み可能。

返却: 一致するチケットの配列（ID, プロパティ, 作成日, 更新日）。totalで総件数も返る。
ページネーション: afterに前回レスポンスのカーソルを指定して次ページ取得。`,
    {
      query: z.string().optional().describe("フリーテキスト検索キーワード。チケット名等の主要フィールドを横断検索。filterGroupsと併用可能"),
      filterGroups: z
        .array(z.object({ filters: z.array(z.object({ propertyName: z.string().describe("フィルタ対象プロパティ名（例: subject, hs_ticket_priority, hs_pipeline_stage）"), operator: z.string().describe("比較演算子: EQ, NEQ, LT, LTE, GT, GTE, CONTAINS_TOKEN, HAS_PROPERTY, NOT_HAS_PROPERTY"), value: z.string().optional().describe("比較値。HAS_PROPERTY/NOT_HAS_PROPERTY以外で必須") })) }))
        .optional().describe("高度なフィルター条件。例: [{filters:[{propertyName:'hs_ticket_priority',operator:'EQ',value:'HIGH'}]}]。operator: EQ, NEQ, LT, GT, CONTAINS_TOKEN 等"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列（例: ['subject','content','hs_pipeline_stage','hs_ticket_priority']）。省略時はデフォルトプロパティのみ"),
      limit: z.number().min(1).max(100).optional().describe("取得件数（デフォルト10、最大100）"),
      after: z.string().optional().describe("ページネーション用カーソル（前回レスポンスのpaging.next.afterの値）"),
    },
    async ({ query, filterGroups, properties, limit, after }) => {
      try {
        const defaultProps = properties ?? [
          "subject", "content", "hs_pipeline", "hs_pipeline_stage",
          "hs_ticket_priority", "hubspot_owner_id", "createdate",
        ];
        const result = await crmSearch("tickets", query ?? "", defaultProps, filterGroups, limit ?? 10, after);
        return { content: [{ type: "text" as const, text: JSON.stringify({ total: result.total, count: result.results.length, paging: result.paging, results: result.results }, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
