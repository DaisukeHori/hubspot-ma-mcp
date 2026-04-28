import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmGet } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerTaskGet(server: McpServer) {
  server.tool(
    "task_get",
    `HubSpot タスク（Task エンゲージメント）の詳細を取得する。
返却: id, properties（hs_task_subject=件名, hs_task_body=本文, hs_task_status=ステータス,
hs_task_priority=優先度, hs_task_type=タイプ（CALL/EMAIL/TODO等）, hs_timestamp=期日,
hubspot_owner_id=担当者）。
properties 省略時は主要プロパティのみ取得。
associations でコンタクト・会社・取引等の関連レコードIDを取得。
公式: GET /crm/v3/objects/tasks/{taskId}`,
    {
      taskId: z.string().describe("タスクのエンゲージメントID（数値文字列）。task_searchやtask_createの返却値のidフィールドから取得"),
      properties: z.array(z.string()).optional().describe("取得するプロパティ名の配列"),
      associations: z.array(z.string()).optional().describe("取得する関連オブジェクト（contacts, companies, deals 等）"),
    },
    async ({ taskId, properties, associations }) => {
      try {
        const defaultProps = properties ?? [
          "hs_task_subject", "hs_task_body", "hs_task_status",
          "hs_task_priority", "hs_task_type", "hs_timestamp",
          "hubspot_owner_id",
        ];
        const result = await crmGet("tasks" as any, taskId, defaultProps, associations);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
