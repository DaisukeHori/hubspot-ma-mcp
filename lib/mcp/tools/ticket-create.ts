import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmCreate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerTicketCreate(server: McpServer) {
  server.tool(
    "ticket_create",
    `HubSpot に新しいチケットを作成する。subjectは必須。hs_pipelineとhs_pipeline_stageも多くの環境で必須（pipeline_listツールで確認）。

返却: 作成されたチケットのID, プロパティ, URL。
additionalPropertiesでカスタムプロパティも設定可能。`,
    {
      subject: z.string().describe("件名（必須）"),
      content: z.string().optional().describe("チケットの内容（テキストまたはHTML）"),
      hs_pipeline: z.string().optional().describe("パイプライン ID"),
      hs_pipeline_stage: z.string().optional().describe("ステージ ID"),
      hs_ticket_priority: z.string().optional().describe("優先度（LOW, MEDIUM, HIGH）"),
      hubspot_owner_id: z.string().optional().describe("オーナー ID"),
      additionalProperties: z.record(z.string()).optional().describe("追加プロパティ（キー:値）。カスタムプロパティ名はproperties_listツールで確認可能"),
    },
    async ({ subject, content, hs_pipeline, hs_pipeline_stage, hs_ticket_priority, hubspot_owner_id, additionalProperties }) => {
      try {
        const properties: Record<string, string> = { subject };
        if (content) properties.content = content;
        if (hs_pipeline) properties.hs_pipeline = hs_pipeline;
        if (hs_pipeline_stage) properties.hs_pipeline_stage = hs_pipeline_stage;
        if (hs_ticket_priority) properties.hs_ticket_priority = hs_ticket_priority;
        if (hubspot_owner_id) properties.hubspot_owner_id = hubspot_owner_id;
        if (additionalProperties) Object.assign(properties, additionalProperties);
        const result = await crmCreate("tickets", properties);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
