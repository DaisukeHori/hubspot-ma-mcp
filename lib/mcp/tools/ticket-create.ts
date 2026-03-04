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
      subject: z.string().describe("チケット件名（必須。例: '設備不具合の報告'）"),
      content: z.string().optional().describe("チケットの内容（テキストまたはHTML）"),
      hs_pipeline: z.string().optional().describe("パイプライン ID"),
      hs_pipeline_stage: z.string().optional().describe("チケットステージID（pipeline_listツールでpipeline=ticketsの各stageのidを取得して指定。多くの環境で必須）"),
      hs_ticket_priority: z.string().optional().describe("優先度（LOW, MEDIUM, HIGH）"),
      hubspot_owner_id: z.string().optional().describe("担当者のHubSpotユーザーID（数値文字列）。HubSpot管理画面のユーザー設定で確認可能"),
      associations: z
        .array(
          z.object({
            to: z.object({ id: z.string().describe("関連先レコードID（数値文字列）") }).describe("関連先レコード"),
            types: z.array(
              z.object({
                associationCategory: z.string().describe("HUBSPOT_DEFINED（標準ラベル）/ USER_DEFINED（カスタムラベル）"),
                associationTypeId: z.number().describe("関連タイプID。association_labelsツールのlistで取得可能。主要デフォルト値: contact→company=279, company→contact=280, deal→contact=3, deal→company=5, ticket→contact=16, ticket→company=26"),
              })
            ).describe("関連タイプ定義の配列"),
          })
        )
        .optional()
        .describe("作成と同時に関連付けるレコードの配列（任意）。後からassociation_createでも紐付け可能"),
      additionalProperties: z.record(z.string()).optional().describe("追加プロパティ（キー:値）。カスタムプロパティ名はproperties_listツールで確認可能"),
    },
    async ({ subject, content, hs_pipeline, hs_pipeline_stage, hs_ticket_priority, hubspot_owner_id, associations, additionalProperties }) => {
      try {
        const properties: Record<string, string> = { subject };
        if (content) properties.content = content;
        if (hs_pipeline) properties.hs_pipeline = hs_pipeline;
        if (hs_pipeline_stage) properties.hs_pipeline_stage = hs_pipeline_stage;
        if (hs_ticket_priority) properties.hs_ticket_priority = hs_ticket_priority;
        if (hubspot_owner_id) properties.hubspot_owner_id = hubspot_owner_id;
        if (additionalProperties) Object.assign(properties, additionalProperties);
        const result = await crmCreate("tickets", properties, associations);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
