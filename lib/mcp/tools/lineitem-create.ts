import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { crmCreate } from "../../hubspot/crm-client";
import { formatToolResult, prettyParam } from "@/lib/mcp/utils/format-result";

export function registerLineItemCreate(server: McpServer) {
  server.tool(
    "lineitem_create",
    `HubSpot に新しい明細行（Line Item）を作成する。nameは必須。取引への紐付けはdealIdまたはassociation_createで行う。

返却: 作成された明細行のID, プロパティ, URL。
商品ライブラリから紐付ける場合はhs_product_idを指定。`,
    {
      name: z.string().describe("明細行の名前（必須。例: 'カットメニュー A × 5'）"),
      quantity: z.string().optional().describe("数量（文字列。例: '5'）"),
      price: z.string().optional().describe("単価（文字列。例: '10000'）"),
      hs_product_id: z.string().optional().describe("商品 ID（商品ライブラリから紐付け）"),
      description: z.string().optional().describe("明細の説明テキスト"),
      dealId: z.string().optional().describe("紐付ける取引 ID"),
      additionalProperties: z.record(z.string()).optional().describe("追加プロパティ（キー:値）。カスタムプロパティ名はproperties_listツールで確認可能"),
    
      pretty: prettyParam,
},
    async ({ name, quantity, price, hs_product_id, description, dealId, additionalProperties, pretty }) => {
      const properties: Record<string, string> = { name };
      if (quantity) properties.quantity = quantity;
      if (price) properties.price = price;
      if (hs_product_id) properties.hs_product_id = hs_product_id;
      if (description) properties.description = description;
      if (additionalProperties) Object.assign(properties, additionalProperties);

      const associations = dealId ? [{
        to: { id: dealId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 20 }],
      }] : undefined;

      const result = await crmCreate("line_items", properties, associations);
      return { content: [{ type: "text", text: formatToolResult(result, pretty) }] };
    }
  );
}
