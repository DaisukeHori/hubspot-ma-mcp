import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmSearch } from "@/lib/hubspot/crm-client";

export function registerQuoteSearch(server: McpServer) {
  server.tool(
  "quote_search",
  "HubSpotの見積もり（Quote）を検索する。返却値: total, results（hs_title, hs_status, hs_expiration_date, hs_public_url_key等）, paging。制約: 最大5 filterGroups×各6 filters、総結果上限10,000件。",
  {
    query: z.string().optional().describe("フリーテキスト検索キーワード。見積もりタイトル等を横断検索"),
    filterGroups: z.array(z.object({
      filters: z.array(z.object({
        propertyName: z.string().describe("フィルタ対象プロパティ名（例: hs_title, hs_status, hs_expiration_date, hs_quote_amount）"),
        operator: z.string().describe("比較演算子: EQ, NEQ, LT, LTE, GT, GTE, CONTAINS_TOKEN, HAS_PROPERTY, NOT_HAS_PROPERTY, IN, NOT_IN, BETWEEN"),
        value: z.string().optional().describe("比較値"),
        values: z.array(z.string()).optional().describe("値の配列（IN/NOT_IN用。小文字必須）"),
        highValue: z.string().optional().describe("範囲上限値（BETWEEN用）"),
      })).describe("AND条件フィルタの配列"),
    })).optional().describe("高度なフィルター条件（OR条件の配列。各グループ内はAND結合）"),
    properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列。省略時はhs_expiration_date, hs_public_url_key, hs_status, hs_title"),
    limit: z.number().min(1).max(200).optional().describe("取得件数（デフォルト10、最大200）"),
    after: z.string().optional().describe("ページネーション用カーソル"),
    sorts: z.array(z.object({
      propertyName: z.string().describe("ソート対象プロパティ名"),
      direction: z.enum(["ASCENDING", "DESCENDING"]).describe("ソート方向"),
    })).optional().describe("ソート条件（1つのみ指定可能）"),
  },
  async ({ query, filterGroups, properties, limit, after, sorts }) => {
    const result = await crmSearch("quotes", query || "", properties, filterGroups, limit || 10, after, sorts);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);
}
