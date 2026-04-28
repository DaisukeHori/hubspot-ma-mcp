import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmUpdate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerDealUpdate(server: McpServer) {
  server.tool(
    "deal_update",
    `HubSpot 取引（Deal）のプロパティを部分更新する（PATCH=指定プロパティのみ上書き）。
主要プロパティ: dealname, amount（金額）, dealstage（パイプラインのステージID）,
pipeline（パイプラインID）, closedate（成約予定日 ISO 8601）, hubspot_owner_id（担当者）,
dealtype（newbusiness / existingbusiness）。
ステージID は文字列（例: 'appointmentscheduled', 'contractsent', 'closedwon', 'closedlost'）で、
パイプライン定義は pipeline_list で確認可能。
プロパティ名は properties_list ツールで確認できる。
公式: PATCH /crm/v3/objects/deals/{dealId}`,
    {
      dealId: z.string().describe("取引レコードID（数値文字列）。deal_searchやdeal_createの返却値のidフィールドから取得"),
      properties: z.record(z.string()).describe("更新するプロパティ（キー:値）"),
    },
    async ({ dealId, properties }) => {
      try {
        const result = await crmUpdate("deals", dealId, properties);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
