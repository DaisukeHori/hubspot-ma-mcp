import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmSearch } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerTaskSearch(server: McpServer) {
  server.tool(
    "task_search",
    `HubSpot タスクを検索する。キーワード検索またはフィルター条件で絞り込み可能。

返却: 一致するタスクの配列（ID, hs_task_subject, hs_task_status, hs_task_priority等）。totalで総件数も返る。
ページネーション対応。`,
    {
      query: z.string().optional().describe("検索キーワード"),
      filterGroups: z
        .array(
          z.object({
            filters: z.array(
              z.object({
                propertyName: z.string(),
                operator: z.string().describe("EQ, NEQ, LT, LTE, GT, GTE, CONTAINS_TOKEN, HAS_PROPERTY, NOT_HAS_PROPERTY"),
                value: z.string().optional(),
              })
            ),
          })
        )
        .optional()
        .describe("フィルター条件"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列"),
      limit: z.number().min(1).max(100).optional().describe("取得件数（デフォルト10）"),
      after: z.string().optional().describe("ページネーション用カーソル"),
    },
    async ({ query, filterGroups, properties, limit, after }) => {
      try {
        const defaultProps = properties ?? [
          "hs_task_subject", "hs_task_body", "hs_task_status",
          "hs_task_priority", "hs_task_type", "hs_timestamp",
          "hubspot_owner_id", "hs_task_reminders",
        ];
        const result = await crmSearch(
          "tasks" as any, query ?? "", defaultProps, filterGroups, limit ?? 10, after
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
