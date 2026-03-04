import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmGet } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerTaskGet(server: McpServer) {
  server.tool(
    "task_get",
    "HubSpot タスクの詳細を取得する。関連レコードの取得も可能。",
    {
      taskId: z.string().describe("タスク ID"),
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
