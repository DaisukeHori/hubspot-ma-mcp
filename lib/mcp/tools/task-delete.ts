import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { crmDelete } from "@/lib/hubspot/crm-client";

export function registerTaskDelete(server: McpServer) {
  server.tool(
  "task_delete",
  "HubSpot タスクを削除する（ゴミ箱へ移動）。confirm=trueが必須。レコードのタイムラインから復元可能。",
  {
    taskId: z.string().describe("タスクのID（数値文字列）。task_searchの返却値のidフィールドから取得"),
    confirm: z.boolean().describe("削除確認フラグ（trueを指定して実行。誤削除防止）"),
  },
  async ({ taskId, confirm }) => {
    if (!confirm) return { content: [{ type: "text" as const, text: "confirm=trueを指定してください" }] };
    await crmDelete("tasks", taskId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ deleted: true, id: taskId }) }],
    };
  }
);
}
