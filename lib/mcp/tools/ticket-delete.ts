import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmDelete } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerTicketDelete(server: McpServer) {
  server.tool(
    "ticket_delete",
    `HubSpot チケットを削除する（ゴミ箱へ移動）。
このツールはアーカイブ（論理削除）であり、HubSpot UIのゴミ箱から90日以内なら復元可能。
削除すると以下が同時に発生:
- コンタクト・会社・取引等とのアソシエーションが解除される
- チケットに紐付くメモ・タスク・通話・メール等は残るが、関連先から外れる
confirm=true が必須。
公式: DELETE /crm/v3/objects/tickets/{ticketId}`,
    {
      ticketId: z.string().describe("チケットレコードID（数値文字列）。ticket_searchやticket_createの返却値のidフィールドから取得"),
      confirm: z.literal(true).describe("削除確認（true を指定）"),
    },
    async ({ ticketId }) => {
      try {
        await crmDelete("tickets", ticketId);
        return { content: [{ type: "text" as const, text: `チケット ${ticketId} を削除しました（ゴミ箱へ移動）。` }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
