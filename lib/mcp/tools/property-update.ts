import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { updateProperty } from "../../hubspot/crm-client";

export function registerPropertyUpdate(server: McpServer) {
  server.tool(
    "property_update",
    `HubSpot プロパティの定義を更新する。label、description、groupName、選択肢（options）の変更が可能。type, fieldType, nameは変更不可。`,
    {
      objectType: z.string().describe("対象オブジェクト"),
      propertyName: z.string().describe("プロパティ内部名"),
      label: z.string().optional().describe("新しいラベル"),
      description: z.string().optional().describe("新しい説明"),
      groupName: z.string().optional().describe("新しいグループ名"),
      options: z.array(z.object({
        label: z.string(),
        value: z.string(),
        displayOrder: z.number(),
      })).optional().describe("新しい選択肢"),
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
