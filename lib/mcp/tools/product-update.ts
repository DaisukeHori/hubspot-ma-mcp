import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmUpdate } from "@/lib/hubspot/crm-client";
import { HubSpotError } from "@/lib/hubspot/errors";

export function registerProductUpdate(server: McpServer) {
  server.tool(
    "product_update",
    `HubSpot 商品（Product）を部分更新する（PATCH=指定プロパティのみ上書き）。
商品ライブラリの定義を更新するためのツール。既存の明細行（Line Item）には影響しない
（明細行は作成時のスナップショットを保持する）。
主要プロパティ:
- name（商品名）, price（標準単価）
- hs_sku（SKU）, description（商品説明）
- hs_cost_of_goods_sold（原価）, hs_recurring_billing_period（請求周期）
- hs_product_type（inventory / service / non_inventory）
公式: PATCH /crm/v3/objects/products/{productId}`,
    {
      productId: z.string().describe("商品レコードID（数値文字列）。product_searchやproduct_createの返却値のidフィールドから取得"),
      properties: z.record(z.string()).describe("更新するプロパティ（キー:値）"),
    },
    async ({ productId, properties }) => {
      try {
        const result = await crmUpdate("products", productId, properties);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof HubSpotError ? `HubSpot API エラー (${error.status}): ${error.message}` : String(error);
        return { content: [{ type: "text" as const, text: message }], isError: true };
      }
    }
  );
}
