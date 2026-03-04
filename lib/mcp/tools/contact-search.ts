import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmSearch } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerContactSearch(server: McpServer) {
  server.tool(
    "contact_search",
    `HubSpot コンタクトを検索する。キーワード検索またはフィルター条件で絞り込み可能。

返却: 一致するコンタクトの配列（ID, プロパティ, 作成日, 更新日）。totalで総件数も返る。
ページネーション: afterに前回レスポンスのカーソルを指定して次ページ取得。`,
    {
      query: z.string().optional().describe("フリーテキスト検索（名前・メール・電話番号等を部分一致検索）"),
      filterGroups: z
        .array(
          z.object({
            filters: z.array(
              z.object({
                propertyName: z.string(),
                operator: z.string().describe("EQ, NEQ, LT, LTE, GT, GTE, CONTAINS_TOKEN, NOT_CONTAINS_TOKEN, HAS_PROPERTY, NOT_HAS_PROPERTY, IN, NOT_IN"),
                value: z.string().optional(),
              })
            ),
          })
        )
        .optional()
        .describe("フィルター条件"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列"),
      limit: z.number().min(1).max(100).optional().describe("取得件数（デフォルト10、最大100）"),
      after: z.string().optional().describe("ページネーション用カーソル（前回レスポンスのpaging.next.afterの値を指定）"),
    },
    async ({ query, filterGroups, properties, limit, after }) => {
      try {
        const defaultProps = properties ?? [
          "email", "firstname", "lastname", "company", "phone",
          "lifecyclestage", "hs_lead_status", "createdate",
        ];
        const result = await crmSearch(
          "contacts", query ?? "", defaultProps, filterGroups, limit ?? 10, after
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { total: result.total, count: result.results.length, paging: result.paging, results: result.results },
                null, 2
              ),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
