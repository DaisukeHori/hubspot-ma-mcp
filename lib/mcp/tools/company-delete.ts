import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmDelete } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerCompanyDelete(server: McpServer) {
  server.tool(
    "company_delete",
    `HubSpot 会社レコードを削除する（ゴミ箱へ移動）。
このツールはアーカイブ（論理削除）であり、HubSpot UIのゴミ箱から90日以内なら復元可能。
削除すると以下が同時に発生:
- 会社に紐付くコンタクト・取引・チケット等のアソシエーションが解除される
- 会社にエンゲージされていたメモ・タスク・通話・メール等は残るが、関連先から外れる
confirm=true が必須（false/省略時は実行されない）。
削除前に company_get で内容を確認すること。
公式: DELETE /crm/v3/objects/companies/{companyId}`,
    {
      companyId: z.string().describe("会社レコードID（数値文字列）。company_searchやcompany_createの返却値のidフィールドから取得"),
      confirm: z.literal(true).describe("削除確認（true を指定）"),
    },
    async ({ companyId }) => {
      try {
        await crmDelete("companies", companyId);
        return { content: [{ type: "text" as const, text: `会社 ${companyId} を削除しました（ゴミ箱へ移動）。` }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
