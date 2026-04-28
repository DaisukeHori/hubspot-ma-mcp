import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmDelete } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerLineItemDelete(server: McpServer) {
  server.tool(
    "lineitem_delete",
    `HubSpot 明細行（Line Item）を削除する（ゴミ箱へ移動）。
このツールはアーカイブ（論理削除）であり、ゴミ箱から復元可能。
削除すると関連する取引（Deal）からも自動的に解除されるが、取引本体や商品（Product）は影響を受けない。
取引の合計金額は明細行の合計から自動再計算される（HubSpot側で）。
confirm=true が必須。
公式: DELETE /crm/v3/objects/line_items/{lineItemId}`,
    {
      lineItemId: z.string().describe("明細行レコードID（数値文字列）。lineitem_searchやlineitem_createの返却値のidフィールドから取得"),
      confirm: z.literal(true).describe("削除確認（true を指定）"),
    },
    async ({ lineItemId }) => {
      try {
        await crmDelete("line_items", lineItemId);
        return { content: [{ type: "text" as const, text: `明細行 ${lineItemId} を削除しました。` }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
