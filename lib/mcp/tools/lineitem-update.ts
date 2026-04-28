import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmUpdate } from "../../hubspot/crm-client";

export function registerLineItemUpdate(server: McpServer) {
  server.tool(
    "lineitem_update",
    `HubSpot 明細行（Line Item）を部分更新する（PATCH=指定プロパティのみ上書き）。
主要プロパティ:
- name（明細名）, quantity（数量）, price（単価）, amount（合計金額）
- hs_product_id（紐付く商品ID）, hs_sku（SKU）
- recurringbillingfrequency（請求周期: monthly/quarterly/annually 等）
- discount, tax（割引・税）
quantity と price を更新すると amount は HubSpot 側で自動再計算される。
プロパティ名は properties_list（objectType="line_items"）で確認可能。
公式: PATCH /crm/v3/objects/line_items/{lineItemId}`,
    {
      lineItemId: z.string().describe("明細行レコードID（数値文字列）。lineitem_searchやlineitem_createの返却値のidフィールドから取得"),
      properties: z.record(z.string()).describe("更新するプロパティ（キー:値）"),
    },
    async ({ lineItemId, properties }) => {
      const result = await crmUpdate("line_items", lineItemId, properties);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
