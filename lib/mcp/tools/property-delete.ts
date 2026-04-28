import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { deleteProperty } from "../../hubspot/crm-client";

export function registerPropertyDelete(server: McpServer) {
  server.tool(
    "property_delete",
    `カスタムプロパティをアーカイブする（標準プロパティは削除不可）。
注意:
- アーカイブされたプロパティは新規レコードでは利用不可になるが、既存レコードに保存された値は残る
- HubSpot UI上では「アーカイブ済み」として閲覧可能
- 同名のプロパティを再作成するには HubSpot サポートへの連絡が必要な場合あり
- ワークフロー・レポート・リスト条件で参照されているプロパティは削除前に依存関係を確認すること
confirm=true が必須（false/省略時は実行されない）。
公式: DELETE /crm/v3/properties/{objectType}/{propertyName}`,
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
