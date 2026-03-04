import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmCreate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerTaskCreate(server: McpServer) {
  server.tool(
    "task_create",
    "HubSpot タスクを作成する。コンタクト・会社・取引等への関連付けも可能。",
    {
      subject: z.string().describe("タスクの件名"),
      body: z.string().optional().describe("タスクの詳細（HTML可）"),
      status: z.enum(["NOT_STARTED", "IN_PROGRESS", "WAITING", "COMPLETED"]).optional().describe("ステータス（デフォルト NOT_STARTED）"),
      priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().describe("優先度"),
      taskType: z.enum(["TODO", "CALL", "EMAIL"]).optional().describe("タスクタイプ"),
      timestamp: z.string().optional().describe("期日（ISO8601）"),
      ownerId: z.string().optional().describe("担当者 ID"),
      associations: z
        .array(
          z.object({
            to: z.object({ id: z.string() }),
            types: z.array(
              z.object({
                associationCategory: z.string().describe("HUBSPOT_DEFINED"),
                associationTypeId: z.number().describe("関連タイプ ID（例: 204=task_to_contact, 192=task_to_company, 216=task_to_deal）"),
              })
            ),
          })
        )
        .optional()
        .describe("関連付け先"),
    },
    async ({ subject, body, status, priority, taskType, timestamp, ownerId, associations }) => {
      try {
        const properties: Record<string, string> = {
          hs_task_subject: subject,
          hs_task_status: status ?? "NOT_STARTED",
          hs_timestamp: timestamp ?? new Date().toISOString(),
        };
        if (body) properties.hs_task_body = body;
        if (priority) properties.hs_task_priority = priority;
        if (taskType) properties.hs_task_type = taskType;
        if (ownerId) properties.hubspot_owner_id = ownerId;
        const result = await crmCreate("tasks" as any, properties, associations);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
