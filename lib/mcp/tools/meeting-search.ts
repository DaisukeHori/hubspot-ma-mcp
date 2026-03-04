import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmSearch } from "@/lib/hubspot/crm-client";

export function registerMeetingSearch(server: McpServer) {
  server.tool(
  "meeting_search",
  "HubSpotのミーティングエンゲージメントを検索する。返却値: total, results（hs_createdate, hs_lastmodifieddate, hs_object_id）, paging。制約: 最大5 filterGroups×各6 filters（合計18 filters）、総結果上限10,000件。",
  {
    query: z.string().optional().describe("フリーテキスト検索キーワード。hs_meeting_title, hs_meeting_bodyを横断検索。filterGroupsと併用可能。注意: hs_body_preview_htmlはフィルタ不可"),
    filterGroups: z.array(z.object({
      filters: z.array(z.object({
        propertyName: z.string().describe("フィルタ対象プロパティ名（例: hs_meeting_title, hs_meeting_body, hs_meeting_start_time, hs_meeting_end_time）"),
        operator: z.string().describe("比較演算子: EQ, NEQ, LT, LTE, GT, GTE, CONTAINS_TOKEN, NOT_CONTAINS_TOKEN, HAS_PROPERTY, NOT_HAS_PROPERTY, IN, NOT_IN, BETWEEN"),
        value: z.string().optional().describe("比較値（EQ/NEQ/LT/GT等で使用）"),
        values: z.array(z.string()).optional().describe("値の配列（IN/NOT_IN演算子用。値は小文字必須）"),
        highValue: z.string().optional().describe("範囲上限値（BETWEEN演算子用）"),
      })).describe("AND条件フィルタの配列"),
    })).optional().describe("高度なフィルター条件（OR条件の配列。各グループ内はAND結合）"),
    properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列（例: ['hs_meeting_title']）。省略時はデフォルトプロパティのみ"),
    limit: z.number().min(1).max(200).optional().describe("取得件数（デフォルト10、最大200）"),
    after: z.string().optional().describe("ページネーション用カーソル（前回レスポンスのpaging.next.afterの値を指定）"),
    sorts: z.array(z.object({
      propertyName: z.string().describe("ソート対象プロパティ名"),
      direction: z.enum(["ASCENDING", "DESCENDING"]).describe("ソート方向"),
    })).optional().describe("ソート条件（1つのみ指定可能）"),
  },
  async ({ query, filterGroups, properties, limit, after, sorts }) => {
    const result = await crmSearch("meetings", query || "", properties, filterGroups, limit || 10, after, sorts);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);
}
