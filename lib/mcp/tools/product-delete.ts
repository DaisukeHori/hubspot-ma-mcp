import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmDelete } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerProductDelete(server: McpServer) {
  server.tool(
    "product_delete",
    `HubSpot 商品（Product）を削除する（ゴミ箱へ移動）。
このツールはアーカイブ（論理削除）であり、HubSpot UIのゴミ箱から復元可能。
注意:
- 過去にこの商品を参照して作成された明細行（Line Item）はスナップショットを保持しているので残るが、
  hs_product_id の参照先がデッドリンクになる
- 既存の取引・見積もり等の集計には影響しない（明細行が独立しているため）
confirm=true が必須。
公式: DELETE /crm/v3/objects/products/{productId}`,
    {
      productId: z.string().describe("商品レコードID（数値文字列）。product_searchやproduct_createの返却値のidフィールドから取得"),
      confirm: z.literal(true).describe("削除確認（true を指定）"),
    },
    async ({ productId }) => {
      try {
        await crmDelete("products", productId);
        return { content: [{ type: "text" as const, text: `商品 ${productId} を削除しました。` }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
