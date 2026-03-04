import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmSearch } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerTicketSearch(server: McpServer) {
  server.tool(
    "ticket_search",
    `HubSpot チケットを検索する。キーワード検索またはフィルター条件で絞り込み可能。

返却: 一致するチケットの配列（ID, プロパティ, 作成日, 更新日）。totalで総件数も返る。propertyName: 'associations.contact'等で関連レコード検索も可能。\n\n制約: 最大5 filterGroups×各6 filters（合計18 filters）、総結果上限10,000件。
ページネーション: afterに前回レスポンスのカーソルを指定して次ページ取得。`,
    {
      query: z.string().optional().describe("フリーテキスト検索キーワード。subject, content, hs_pipeline_stage, hs_ticket_category, hs_ticket_idを横断検索。filterGroupsと併用可能"),
      filterGroups: z
        .array(z.object({ filters: z.array(z.object({ propertyName: z.string().describe("フィルタ対象プロパティ名（例: subject, hs_ticket_priority, hs_pipeline_stage）"), operator: z.string().describe("比較演算子: EQ, NEQ, LT, LTE, GT, GTE, BETWEEN, IN, NOT_IN, HAS_PROPERTY, NOT_HAS_PROPERTY, CONTAINS_TOKEN, NOT_CONTAINS_TOKEN"), value: z.string().optional().describe("比較値（EQ/NEQ/LT/GT等で使用）"), values: z.array(z.string()).optional().describe("値の配列（IN/NOT_IN演算子用。値は小文字必須）"), highValue: z.string().optional().describe("範囲上限値（BETWEEN演算子用。valueが下限、highValueが上限）") })).describe("AND条件フィルタの配列") }))
        .optional().describe("高度なフィルター条件。例: [{filters:[{propertyName:'hs_ticket_priority',operator:'EQ',value:'HIGH'}]}]。operator: EQ, NEQ, LT, GT, CONTAINS_TOKEN 等"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列（例: ['subject','content','hs_pipeline_stage','hs_ticket_priority']）。省略時はデフォルトプロパティのみ"),
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
          "subject", "content", "hs_pipeline", "hs_pipeline_stage",
          "hs_ticket_priority", "hubspot_owner_id", "createdate",
        ];
        const result = await crmSearch("tickets", query ?? "", defaultProps, filterGroups, limit ?? 10, after, sorts);
        return { content: [{ type: "text" as const, text: JSON.stringify({ total: result.total, count: result.results.length, paging: result.paging, results: result.results }, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
