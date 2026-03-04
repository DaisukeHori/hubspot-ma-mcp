import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmUpdate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerTaskUpdate(server: McpServer) {
  server.tool(
    "task_update",
    "HubSpot タスクを更新する。件名・ステータス・優先度・担当者等を変更可能。",
    {
      taskId: z.string().describe("タスク ID"),
      properties: z.record(z.string()).describe("更新するプロパティ（hs_task_subject, hs_task_status, hs_task_priority 等）"),
    },
    async ({ taskId, properties }) => {
      try {
        const result = await crmUpdate("tasks" as any, taskId, properties);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
