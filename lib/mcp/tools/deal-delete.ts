import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmDelete } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerDealDelete(server: McpServer) {
  server.tool(
    "deal_delete",
    `HubSpot 取引（Deal）を削除する（ゴミ箱へ移動）。
このツールはアーカイブ（論理削除）であり、HubSpot UIのゴミ箱から90日以内なら復元可能。
削除すると以下が同時に発生:
- コンタクト・会社・チケット等とのアソシエーションが解除される
- 関連するLine Item（明細行）は残るが、取引から切り離される
confirm=true が必須。
削除前に deal_get で内容を確認すること。
公式: DELETE /crm/v3/objects/deals/{dealId}`,
    {
      dealId: z.string().describe("取引レコードID（数値文字列）。deal_searchやdeal_createの返却値のidフィールドから取得"),
      confirm: z.literal(true).describe("削除確認（true を指定）"),
    },
    async ({ dealId }) => {
      try {
        await crmDelete("deals", dealId);
        return { content: [{ type: "text" as const, text: `取引 ${dealId} を削除しました（ゴミ箱へ移動）。` }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
