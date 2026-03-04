import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmSearch } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerNoteSearch(server: McpServer) {
  server.tool(
    "note_search",
    `HubSpot メモ（Note）を検索する。キーワード検索またはフィルター条件で絞り込み可能。

返却: 一致するメモの配列（ID, hs_note_body, hs_timestamp等）。totalで総件数も返る。
ページネーション対応。`,
    {
      query: z.string().optional().describe("フリーテキスト検索キーワード。メモ本文等を横断検索"),
      filterGroups: z
        .array(
          z.object({
            filters: z.array(
              z.object({
                propertyName: z.string().describe("フィルタ対象プロパティ名（例: hs_note_body, hs_timestamp, hs_object_id）"),
                operator: z.string().describe("EQ, NEQ, LT, LTE, GT, GTE, CONTAINS_TOKEN, HAS_PROPERTY, NOT_HAS_PROPERTY"),
                value: z.string().optional(),
              })
            ),
          })
        )
        .optional()
        .describe("高度なフィルター条件（OR条件の配列。各グループ内のfiltersはAND結合）"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列"),
      limit: z.number().min(1).max(100).optional().describe("取得件数（デフォルト10）"),
      after: z.string().optional().describe("ページネーション用カーソル"),
    },
    async ({ query, filterGroups, properties, limit, after }) => {
      try {
        const defaultProps = properties ?? [
          "hs_note_body", "hs_timestamp", "hubspot_owner_id",
          "hs_attachment_ids", "hs_createdate",
        ];
        const result = await crmSearch(
          "notes" as any, query ?? "", defaultProps, filterGroups, limit ?? 10, after
        );
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ total: result.total, count: result.results.length, paging: result.paging, results: result.results }, null, 2),
          }],
        };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
