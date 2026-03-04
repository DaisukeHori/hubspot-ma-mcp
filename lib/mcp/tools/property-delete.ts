import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { deleteProperty } from "../../hubspot/crm-client";

export function registerPropertyDelete(server: McpServer) {
  server.tool(
    "property_delete",
    "カスタムプロパティを削除（アーカイブ）する。confirm=true 必須",
    {
      objectType: z.string().describe("対象オブジェクトタイプ: contacts, companies, deals, tickets, line_items, products のいずれか"),
      propertyName: z.string().describe("削除するプロパティの内部名"),
      confirm: z.boolean().describe("削除確認（true 必須）"),
    },
    async ({ objectType, propertyName, confirm }) => {
      if (!confirm) {
        return { content: [{ type: "text", text: "削除を実行するには confirm=true を指定してください。" }] };
      }
      await deleteProperty(objectType, propertyName);
      return { content: [{ type: "text", text: `プロパティ "${propertyName}" を削除しました。` }] };
    }
  );
}
