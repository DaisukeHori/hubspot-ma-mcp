import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { updateProperty } from "../../hubspot/crm-client";

export function registerPropertyUpdate(server: McpServer) {
  server.tool(
    "property_update",
    `HubSpot プロパティの定義を更新する。label、description、groupName、選択肢（options）の変更が可能。type, fieldType, nameは変更不可。`,
    {
      objectType: z.string().describe("対象オブジェクトタイプ: contacts, companies, deals, tickets, line_items, products のいずれか"),
      propertyName: z.string().describe("プロパティ内部名"),
      label: z.string().optional().describe("新しい表示ラベル名"),
      description: z.string().optional().describe("新しいプロパティ説明文（UIに表示される）"),
      groupName: z.string().optional().describe("新しいグループ名"),
      options: z.array(z.object({
        label: z.string().describe("選択肢の表示名（例: 'Aランク'）"),
        value: z.string().describe("選択肢の内部値（例: 'rank_a'。英数字推奨）"),
        displayOrder: z.number().describe("表示順（0始まり。小さいほど先に表示）"),
      })).optional().describe("選択肢の配列（enumeration型用）。各要素にlabel, value, displayOrderを指定"),
    },
    async ({ objectType, propertyName, ...updates }) => {
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );
      const result = await updateProperty(objectType, propertyName, cleanUpdates);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
