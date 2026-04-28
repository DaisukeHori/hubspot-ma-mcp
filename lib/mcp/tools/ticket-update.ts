import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmUpdate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerTicketUpdate(server: McpServer) {
  server.tool(
    "ticket_update",
    `HubSpot チケットを部分更新する（PATCH=指定プロパティのみ上書き）。
主要プロパティ:
- subject（タイトル）, content（内容/HTML）
- hs_pipeline, hs_pipeline_stage（パイプライン・ステージID）
- hs_ticket_priority（優先度: LOW/MEDIUM/HIGH）
- hubspot_owner_id（担当者）
- hs_ticket_category（カテゴリ）, source_type（チャネル）
ステージID は文字列（例: 'new', 'waiting_on_contact', 'waiting_on_us', 'closed'）で、
パイプライン定義は pipeline_list で確認可能。
公式: PATCH /crm/v3/objects/tickets/{ticketId}`,
    {
      ticketId: z.string().describe("チケットレコードID（数値文字列）。ticket_searchやticket_createの返却値のidフィールドから取得"),
      properties: z.record(z.string()).describe("更新するプロパティ（キー:値）"),
    },
    async ({ ticketId, properties }) => {
      try {
        const result = await crmUpdate("tickets", ticketId, properties);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
