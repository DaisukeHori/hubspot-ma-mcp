import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmUpdate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerTaskUpdate(server: McpServer) {
  server.tool(
    "task_update",
    `HubSpot タスクを部分更新する（PATCH=指定プロパティのみ上書き）。
主要プロパティ:
- hs_task_subject（件名）, hs_task_body（本文HTML）
- hs_task_status（NOT_STARTED / IN_PROGRESS / WAITING / COMPLETED）
- hs_task_priority（LOW / MEDIUM / HIGH）
- hs_task_type（TODO / CALL / EMAIL）
- hs_timestamp（期日 ISO 8601）, hubspot_owner_id（担当者）
タスクを完了にするには hs_task_status="COMPLETED" を指定。
公式: PATCH /crm/v3/objects/tasks/{taskId}`,
    {
      taskId: z.string().describe("タスクのエンゲージメントID（数値文字列）。task_searchやtask_createの返却値のidフィールドから取得"),
      properties: z.record(z.string()).describe("更新するプロパティ（hs_task_subject, hs_task_status, hs_task_priority 等）"),
    
      pretty: prettyParam,
},
    async ({ taskId, properties, pretty }) => {
      try {
        const result = await crmUpdate("tasks" as any, taskId, properties);
        return { content: [{ type: "text" as const, text: formatToolResult(result, pretty) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
